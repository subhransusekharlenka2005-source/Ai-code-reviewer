export type ReviewIssue = {
  severity: "error" | "warning" | "info";
  line?: number;
  title: string;
  message: string;
  suggestion: string;
};

export type ReviewResult = {
  score: number;
  issueImpact: number;
  issueCounts: { error: number; warning: number; info: number };
  summary: string;
  issues: ReviewIssue[];
  fixedCode: string;
};

const lineNo = (code: string, index: number) => code.slice(0, index).split("\n").length;

function addIssue(
  issues: ReviewIssue[],
  code: string,
  index: number,
  issue: Omit<ReviewIssue, "line">
) {
  issues.push({ ...issue, line: lineNo(code, index) });
}

export function reviewCode(language: string, code: string): ReviewResult {
  const issues: ReviewIssue[] = [];
  const lower = language.toLowerCase();
  let fixed = code;

  if (!code.trim()) {
    return {
      score: 0,
      issueImpact: 100,
      issueCounts: { error: 1, warning: 0, info: 0 },
      summary: "No code was provided.",
      issues: [
        {
          severity: "error",
          title: "Empty code snippet",
          message: "No source code was detected in the editor.",
          suggestion: "Paste or type the code you would like reviewed.",
        },
      ],
      fixedCode: code,
    };
  }

  const lines = code.split("\n");

  // =========================================================================
  // 1. UNIVERSAL SYNTAX: UNMATCHED BRACKETS, PARENTHESES, BRACES
  // =========================================================================
  // Check delimiters except inside strings or single-line comments
  const stack: { char: string; line: number; index: number }[] = [];
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : "";
    const nextChar = i < code.length - 1 ? code[i + 1] : "";
    const currentLine = lineNo(code, i);

    if (char === "\n") {
      inLineComment = false;
      continue;
    }

    if (!inString && !inBlockComment && !inLineComment) {
      if ((char === "/" && nextChar === "/") || (char === "#" && !lower.includes("css") && !lower.includes("html"))) {
        inLineComment = true;
        continue;
      }
      if (char === "/" && nextChar === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        inString = char;
        continue;
      }
    } else if (inString && char === inString && prevChar !== "\\") {
      inString = null;
      continue;
    } else if (inBlockComment && char === "*" && nextChar === "/") {
      inBlockComment = false;
      i++;
      continue;
    }

    if (!inString && !inLineComment && !inBlockComment) {
      if (char === "(" || char === "[" || (char === "{" && !lower.includes("html"))) {
        stack.push({ char, line: currentLine, index: i });
      } else if (char === ")" || char === "]" || (char === "}" && !lower.includes("html"))) {
        const expected = char === ")" ? "(" : char === "]" ? "[" : "{";
        if (stack.length === 0) {
          issues.push({
            severity: "error",
            line: currentLine,
            title: `Unexpected closing '${char}'`,
            message: `Found an unexpected closing '${char}' on line ${currentLine} without any corresponding opening '${expected}'.`,
            suggestion: `Remove the stray '${char}' or add the matching opening '${expected}'.`,
          });
        } else {
          const top = stack.pop()!;
          if (top.char !== expected) {
            issues.push({
              severity: "error",
              line: currentLine,
              title: `Mismatched bracket delimiter`,
              message: `Mismatched delimiters: Opening '${top.char}' from line ${top.line} was closed by '${char}' on line ${currentLine}.`,
              suggestion: `Change '${char}' to the matching closing bracket for '${top.char}'.`,
            });
          }
        }
      }
    }
  }

  // Any unclosed brackets left on stack
  if (stack.length > 0) {
    for (const item of stack) {
      const closingChar = item.char === "(" ? ")" : item.char === "[" ? "]" : "}";
      issues.push({
        severity: "error",
        line: item.line,
        title: `Unclosed delimiter '${item.char}'`,
        message: `The '${item.char}' opened on line ${item.line} is never closed in your code.`,
        suggestion: `Add the matching '${closingChar}' where this block or expression finishes.`,
      });
      fixed = fixed + closingChar;
    }
  }

  // =========================================================================
  // 2. ASSIGNMENT IN CONDITION (= instead of == or ===)
  // =========================================================================
  lines.forEach((lineText, idx) => {
    const lineIndex = idx + 1;
    // Check if/while with single = not preceded/followed by !, =, <, >
    const condAssignMatch = lineText.match(/\b(if|while|elif)\s*\([^\)]*[^!=><\s]\s*=\s*[^=][^\)]*\)/i);
    if (condAssignMatch) {
      issues.push({
        severity: "error",
        line: lineIndex,
        title: "Accidental assignment in condition",
        message: `Line ${lineIndex} uses '=' (single equals / assignment) inside a condition. In comparison checks, '=' assigns a value rather than testing equality.`,
        suggestion: "Replace '=' with '==' or '===' for equality comparison.",
      });
    }
  });
  fixed = fixed.replace(/(\b(?:if|while|elif)\s*\([^\)]*[^!=><\s]\s*)=\s*([^=][^\)]*\))/gi, "$1=== $2");

  // =========================================================================
  // 3. PYTHON DEEP ANALYSIS & CORRECTIONS
  // =========================================================================
  if (lower.includes("python")) {
    lines.forEach((lineText, idx) => {
      const lineIndex = idx + 1;
      const trimmed = lineText.trim();

      // Missing colon at end of compound statements
      const colonMatch = trimmed.match(/^(def\s+\w+\s*\(.*?\)|class\s+\w+|if\b.+|elif\b.+|else|for\b.+|while\b.+|try|except\b.*?|finally|with\b.+)$/);
      if (colonMatch && !trimmed.endsWith(":") && !trimmed.startsWith("#")) {
        issues.push({
          severity: "error",
          line: lineIndex,
          title: "Missing colon ':' in statement",
          message: `In Python, compound statements (${trimmed.split(" ")[0]}) must end with a colon ':'. Line ${lineIndex} is missing ':'.`,
          suggestion: `Add a colon ':' at the end of line ${lineIndex}.`,
        });
      }

      // Python 2 print statement (print "text" instead of print("text"))
      const printNoParens = trimmed.match(/^print\s+(["'].+["']|\w+.*)$/);
      if (printNoParens && !trimmed.startsWith("print(") && !trimmed.startsWith("print (")) {
        issues.push({
          severity: "error",
          line: lineIndex,
          title: "Missing parentheses in print call",
          message: `Line ${lineIndex} uses 'print ...' without parentheses. In Python 3, print is a function and requires parentheses: print(...).`,
          suggestion: `Change 'print ${printNoParens[1]}' to 'print(${printNoParens[1]})'.`,
        });
      }

      // Common Python keyword typos
      if (/\b(true|false|null|none)\b/.test(trimmed) && !/["'].*["']/.test(trimmed)) {
        if (/\btrue\b/.test(trimmed)) {
          issues.push({
            severity: "error",
            line: lineIndex,
            title: "Lowercase 'true' in Python",
            message: `Line ${lineIndex} uses 'true'. In Python, boolean True must be capitalized.`,
            suggestion: "Change 'true' to 'True'.",
          });
        }
        if (/\bfalse\b/.test(trimmed)) {
          issues.push({
            severity: "error",
            line: lineIndex,
            title: "Lowercase 'false' in Python",
            message: `Line ${lineIndex} uses 'false'. In Python, boolean False must be capitalized.`,
            suggestion: "Change 'false' to 'False'.",
          });
        }
        if (/\b(none|null)\b/.test(trimmed)) {
          issues.push({
            severity: "error",
            line: lineIndex,
            title: "Invalid null/none value",
            message: `Line ${lineIndex} uses '${trimmed.includes("null") ? "null" : "none"}'. In Python, the null value is 'None'.`,
            suggestion: "Change to 'None'.",
          });
        }
      }

      // 'function' keyword instead of 'def'
      if (/^\s*function\s+\w+\s*\(/.test(lineText)) {
        issues.push({
          severity: "error",
          line: lineIndex,
          title: "Incorrect 'function' keyword",
          message: `Line ${lineIndex} uses 'function'. Python uses the 'def' keyword to declare functions.`,
          suggestion: "Replace 'function' with 'def'.",
        });
      }

      // Comparison with single = in python condition: if x = 5:
      const pyCondAssign = trimmed.match(/^(if|elif|while)\s+[^:=><\n]+=\s*[^:=><\n]+:?$/);
      if (pyCondAssign && !trimmed.includes("==") && !trimmed.includes("!=")) {
        issues.push({
          severity: "error",
          line: lineIndex,
          title: "Assignment '=' used in condition",
          message: `Line ${lineIndex} uses '=' inside an '${pyCondAssign[1]}' statement. Use '==' for equality comparison.`,
          suggestion: "Replace '=' with '=='.",
        });
      }
    });

    // Check for missing common imports
    const commonModules = ["math", "json", "os", "sys", "random", "re"];
    for (const mod of commonModules) {
      const moduleCall = new RegExp(`\\b${mod}\\.[a-zA-Z_]`);
      const importRegex = new RegExp(`(?:import\\s+${mod}|from\\s+${mod}\\s+import)`);
      if (moduleCall.test(code) && !importRegex.test(code)) {
        issues.push({
          severity: "warning",
          line: 1,
          title: `Missing 'import ${mod}' statement`,
          message: `The '${mod}' module is referenced in your code, but '${mod}' is not imported.`,
          suggestion: `Add 'import ${mod}' at the very top of your Python file.`,
        });
        if (!fixed.includes(`import ${mod}`)) {
          fixed = `import ${mod}\n` + fixed;
        }
      }
    }

    // Bare except check
    const bareExcept = code.match(/except\s*:/);
    if (bareExcept) {
      addIssue(issues, code, bareExcept.index ?? 0, {
        severity: "warning",
        title: "Bare 'except:' clause",
        message: "A bare 'except:' catches all exceptions, including KeyboardInterrupt and SystemExit, hiding critical issues.",
        suggestion: "Catch specific exceptions like 'except Exception:' or 'except ValueError:'.",
      });
      fixed = fixed.replace(/except\s*:/g, "except Exception:");
    }

    // Auto-fix Python syntax issues
    fixed = fixed.replace(/^(\s*(?:def\s+\w+\s*\(.*?\)|class\s+\w+|if\b.+|elif\b.+|else|for\b.+|while\b.+|try|except\b.*?|finally|with\b.+))(?<!:)$/gm, "$1:");
    fixed = fixed.replace(/^(\s*)print\s+(["'].+["']|\w+.*)$/gm, "$1print($2)");
    fixed = fixed.replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False").replace(/\bnull\b/g, "None");
    fixed = fixed.replace(/^\s*function\s+(\w+)\s*\(/gm, "def $1(");
    fixed = fixed.replace(/(\b(?:if|elif|while)\s+[^:=><\n]+)\s*=\s*([^:=><\n]+:?)/g, "$1 == $2");
  }

  // =========================================================================
  // 4. JAVASCRIPT / TYPESCRIPT DEEP ANALYSIS & CORRECTIONS
  // =========================================================================
  if (/(javascript|typescript)/.test(lower)) {
    // Missing let/const/var on assignments
    lines.forEach((lineText, idx) => {
      const lineIndex = idx + 1;
      const trimmed = lineText.trim();

      // Loose equality
      if (/[^!=]==[^=]/.test(trimmed)) {
        issues.push({
          severity: "warning",
          line: lineIndex,
          title: "Loose equality (==) operator",
          message: `Line ${lineIndex} uses '=='. Loose equality performs unintended type coercion.`,
          suggestion: "Use strict equality '===' instead of '=='.",
        });
      }

      // Legacy var keyword
      if (/\bvar\s+[a-zA-Z_$]/.test(trimmed)) {
        issues.push({
          severity: "info",
          line: lineIndex,
          title: "Legacy 'var' declaration",
          message: `Line ${lineIndex} uses 'var', which has function scope and can leak variables.`,
          suggestion: "Use 'let' for mutable variables or 'const' for immutable values.",
        });
      }

      // Console log
      if (/console\.log\s*\(/.test(trimmed)) {
        issues.push({
          severity: "info",
          line: lineIndex,
          title: "Console log statement in code",
          message: `Line ${lineIndex} contains console.log. Leaving debug logs in production slows performance and leaks data.`,
          suggestion: "Remove console.log before shipping or use a configured logger.",
        });
      }
    });

    if (lower.includes("typescript")) {
      const anyMatch = code.match(/:\s*any\b|\bas\s+any\b/);
      if (anyMatch) {
        addIssue(issues, code, anyMatch.index ?? 0, {
          severity: "warning",
          title: "Unsafe 'any' type",
          message: "The 'any' type disables compiler type-checking and removes TypeScript benefits.",
          suggestion: "Replace 'any' with a specific interface, type union, or 'unknown'.",
        });
      }
    }

    const evalMatch = code.match(/\beval\s*\(/);
    if (evalMatch) {
      addIssue(issues, code, evalMatch.index ?? 0, {
        severity: "error",
        title: "Dangerous eval() execution",
        message: "eval() executes dynamic strings as code, creating critical remote code execution (XSS/injection) vulnerabilities.",
        suggestion: "Use JSON.parse() for data parsing, or an explicit lookup map.",
      });
    }

    // Auto-fix JS/TS
    fixed = fixed.replace(/([^!=])==([^=])/g, "$1===$2");
    fixed = fixed.replace(/\bvar\s+/g, "let ");
    fixed = fixed.replace(/^\s*console\.log\(.*\);?\s*$/gm, "// removed debugging console.log");
  }

  // =========================================================================
  // 5. HTML DEEP ANALYSIS & CORRECTIONS
  // =========================================================================
  if (lower.includes("html")) {
    // Check for document structure
    if (!/<!DOCTYPE\s+html>/i.test(code) && code.includes("<html")) {
      issues.push({
        severity: "warning",
        line: 1,
        title: "Missing <!DOCTYPE html> declaration",
        message: "HTML5 documents must start with <!DOCTYPE html> to prevent browsers from triggering quirks mode.",
        suggestion: "Add '<!DOCTYPE html>' as the very first line of your document.",
      });
      fixed = "<!DOCTYPE html>\n" + fixed;
    }

    // Missing <head> or <body>
    if (code.includes("<html") && !code.includes("<head")) {
      issues.push({
        severity: "warning",
        line: 1,
        title: "Missing <head> section",
        message: "Valid HTML documents require a <head> element containing charset, viewport, and title metadata.",
        suggestion: "Include a <head> block with meta tags and title.",
      });
    }

    // Missing <title> in <head>
    if (code.includes("<head") && !code.includes("<title")) {
      issues.push({
        severity: "warning",
        line: 1,
        title: "Missing <title> element in <head>",
        message: "Every web page must include a descriptive <title> tag inside <head> for accessibility and SEO.",
        suggestion: "Add '<title>Page Title</title>' inside the <head> element.",
      });
      fixed = fixed.replace(/<head>/i, "<head>\n  <title>Document</title>");
    }

    // Missing alt on <img> tags
    const imgMissingAlt = code.match(/<img(?![^>]*\balt=)[^>]*>/i);
    if (imgMissingAlt) {
      addIssue(issues, code, imgMissingAlt.index ?? 0, {
        severity: "error",
        title: "Missing 'alt' attribute on <img> tag",
        message: "All <img> elements require an 'alt' attribute for screen reader accessibility (WCAG 2.1 compliance).",
        suggestion: 'Add alt="Descriptive text" (or alt="" for decorative images) to every <img> element.',
      });
      fixed = fixed.replace(/(<img(?![^>]*\balt=)[^>]*?)(\/?>)/gi, '$1 alt=""$2');
    }

    // Unclosed HTML tags (track div, p, span, h1-h6, table, ul, ol, li, a, form)
    const containerTags = ["div", "p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "table", "ul", "ol", "li", "a", "form", "section", "article"];
    for (const tag of containerTags) {
      const openMatches = code.match(new RegExp(`<${tag}\\b[^>]*>`, "gi")) || [];
      const closeMatches = code.match(new RegExp(`</${tag}>`, "gi")) || [];
      if (openMatches.length > closeMatches.length) {
        const diff = openMatches.length - closeMatches.length;
        issues.push({
          severity: "error",
          line: 1,
          title: `Unclosed <${tag}> tag (${diff} missing)`,
          message: `Your HTML opens ${openMatches.length} <${tag}> tag${openMatches.length === 1 ? "" : "s"} but only has ${closeMatches.length} closing </${tag}> tag${closeMatches.length === 1 ? "" : "s"}.`,
          suggestion: `Add the missing </${tag}> closing tag${diff === 1 ? "" : "s"} to balance your markup.`,
        });
        for (let k = 0; k < diff; k++) {
          fixed = fixed + `\n</${tag}>`;
        }
      }
    }

    // Target _blank without rel="noopener noreferrer"
    const insecureBlank = code.match(/<a(?=[^>]*\btarget=["']_blank["'])(?![^>]*\brel=["'][^"']*noopener)[^>]*>/i);
    if (insecureBlank) {
      addIssue(issues, code, insecureBlank.index ?? 0, {
        severity: "warning",
        title: "Reverse tabnabbing vulnerability (target='_blank')",
        message: "Opening links in a new tab without rel=\"noopener noreferrer\" allows the target window to access window.opener, creating security risks.",
        suggestion: "Add rel=\"noopener noreferrer\" to all target=\"_blank\" hyperlinks.",
      });
      fixed = fixed.replace(/(<a\b[^>]*\btarget=["']_blank["'])(?![^>]*\brel=)([^>]*>)/gi, '$1 rel="noopener noreferrer"$2');
    }

    // Deprecated HTML tags
    const deprecatedTagMatch = code.match(/<(center|font|marquee|blink|strike|big)\b[^>]*>/i);
    if (deprecatedTagMatch) {
      addIssue(issues, code, deprecatedTagMatch.index ?? 0, {
        severity: "warning",
        title: `Deprecated <${deprecatedTagMatch[1]}> element`,
        message: `<${deprecatedTagMatch[1]}> is obsolete in modern HTML5 standards.`,
        suggestion: "Use CSS (such as text-align: center or font-size) instead of deprecated HTML tags.",
      });
      fixed = fixed.replace(/<center>/gi, '<div style="text-align: center;">').replace(/<\/center>/gi, "</div>");
      fixed = fixed.replace(/<font[^>]*>/gi, '<span style="font-family: sans-serif;">').replace(/<\/font>/gi, "</span>");
    }

    // Inline event handlers
    const inlineEvent = code.match(/\bon[a-z]+\s*=\s*["'][^"']+["']/i);
    if (inlineEvent) {
      addIssue(issues, code, inlineEvent.index ?? 0, {
        severity: "info",
        title: "Inline JavaScript event handler",
        message: "Inline event attributes like onclick violate strict Content Security Policies (CSP).",
        suggestion: "Separate JavaScript logic from HTML markup using addEventListener.",
      });
    }

    // Insecure HTTP assets
    const insecureHttp = code.match(/<(?:script|link|iframe|source)[^>]*(?:src|href)=["']http:\/\/[^"']+["']/i);
    if (insecureHttp) {
      addIssue(issues, code, insecureHttp.index ?? 0, {
        severity: "error",
        title: "Insecure mixed content (HTTP resource)",
        message: "Loading external scripts, stylesheets, or iframes over unencrypted HTTP will be blocked by browsers on HTTPS sites.",
        suggestion: "Use secure HTTPS URLs for all external stylesheets, scripts, and media.",
      });
      fixed = fixed.replace(/(src|href)=["']http:\/\/([^"']+)["']/gi, '$1="https://$2"');
    }
  }

  // =========================================================================
  // 6. C / C++ / JAVA ANALYSIS & CORRECTIONS
  // =========================================================================
  if (/(c|c\+\+|java|c#)/.test(lower)) {
    // Missing semicolon on simple statements
    lines.forEach((lineText, idx) => {
      const lineIndex = idx + 1;
      const trimmed = lineText.trim();
      if (
        /^(?:int|float|double|char|string|boolean|printf|scanf|cout|cin|return|System\.out\.println)\b/i.test(trimmed) &&
        !trimmed.endsWith(";") &&
        !trimmed.endsWith("{") &&
        !trimmed.endsWith("}") &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("#")
      ) {
        issues.push({
          severity: "error",
          line: lineIndex,
          title: "Missing semicolon ';'",
          message: `Line ${lineIndex} appears to be a statement missing a trailing semicolon ';'.`,
          suggestion: `Append a semicolon ';' to the end of line ${lineIndex}.`,
        });
      }
    });

    if (lower === "c" || lower === "c++") {
      // Check for missing include
      if (code.includes("printf") && !code.includes("stdio.h")) {
        issues.push({
          severity: "warning",
          line: 1,
          title: "Missing #include <stdio.h>",
          message: "printf() is used but <stdio.h> header is not included.",
          suggestion: "Add '#include <stdio.h>' at the top of the file.",
        });
        if (!fixed.includes("stdio.h")) fixed = "#include <stdio.h>\n" + fixed;
      }
      if (code.includes("cout") && !code.includes("iostream")) {
        issues.push({
          severity: "warning",
          line: 1,
          title: "Missing #include <iostream>",
          message: "std::cout is used but <iostream> header is not included.",
          suggestion: "Add '#include <iostream>' at the top of the file.",
        });
        if (!fixed.includes("iostream")) fixed = "#include <iostream>\n" + fixed;
      }

      // scanf missing &
      const scanfBad = code.match(/scanf\s*\(\s*["'][^"']+["']\s*,\s*([a-zA-Z_]\w*)\s*\)/);
      if (scanfBad) {
        addIssue(issues, code, scanfBad.index ?? 0, {
          severity: "error",
          title: "scanf() missing address-of operator '&'",
          message: `scanf requires a pointer to write input: '${scanfBad[1]}' was passed instead of '&${scanfBad[1]}'. This will cause a segmentation fault.`,
          suggestion: `Change '${scanfBad[1]}' to '&${scanfBad[1]}'.`,
        });
        fixed = fixed.replace(new RegExp(`(scanf\\s*\\(\\s*["'][^"']+["']\\s*,\\s*)(${scanfBad[1]})\\s*\\)`), "$1&$2)");
      }
    }

    if (lower === "java") {
      // String comparison with ==
      lines.forEach((lineText, idx) => {
        const lineIndex = idx + 1;
        if (/\w+\s*==\s*["'][^"']+["']/.test(lineText)) {
          issues.push({
            severity: "warning",
            line: lineIndex,
            title: "String comparison using '==' operator",
            message: `Line ${lineIndex} compares a String using '=='. In Java, '==' checks reference identity, not string contents.`,
            suggestion: "Use '.equals()' instead of '==' for String comparisons.",
          });
        }
      });
      fixed = fixed.replace(/(\w+)\s*==\s*(["'][^"']+["'])/g, "$1.equals($2)");
    }
  }

  // =========================================================================
  // 7. SQL DEEP ANALYSIS & CORRECTIONS
  // =========================================================================
  if (lower.includes("sql")) {
    // Unbounded DELETE or UPDATE without WHERE
    if (/^\s*(DELETE\s+FROM\s+\w+|UPDATE\s+\w+\s+SET\s+[^;]+)\s*;?$/im.test(code) && !/WHERE\b/i.test(code)) {
      issues.push({
        severity: "error",
        line: 1,
        title: "Dangerous UPDATE or DELETE without WHERE clause",
        message: "Executing an UPDATE or DELETE statement without a WHERE clause will modify or delete ALL records in the entire table!",
        suggestion: "Add a WHERE clause specifying the targeted primary key or condition: e.g. WHERE id = :id.",
      });
    }

    // SELECT * check
    const selectStar = code.match(/SELECT\s+\*\s+FROM/i);
    if (selectStar) {
      addIssue(issues, code, selectStar.index ?? 0, {
        severity: "info",
        title: "SELECT * wildcard query",
        message: "SELECT * retrieves all columns from the database table, increasing I/O overhead and network transfer.",
        suggestion: "Specify the exact columns required by your application instead of '*'.",
      });
    }
  }

  // =========================================================================
  // 8. CSS DEEP ANALYSIS & CORRECTIONS
  // =========================================================================
  if (lower.includes("css")) {
    const importantMatch = code.match(/!important/g);
    if (importantMatch && importantMatch.length > 2) {
      const firstIdx = code.indexOf("!important");
      addIssue(issues, code, firstIdx >= 0 ? firstIdx : 0, {
        severity: "warning",
        title: "Overuse of !important rule",
        message: `Found ${importantMatch.length} uses of !important. Overusing !important breaks CSS cascade specificity.`,
        suggestion: "Refactor your class specificity instead of forcing !important overrides.",
      });
    }
  }

  // =========================================================================
  // 9. HARD-CODED SECRETS CHECK (ALL LANGUAGES)
  // =========================================================================
  const secretMatch = code.match(/(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']+["']/i);
  if (secretMatch) {
    addIssue(issues, code, secretMatch.index ?? 0, {
      severity: "error",
      title: "Hard-coded secret or credential",
      message: "A potential credential or API key is embedded directly in your source code.",
      suggestion: "Store secrets in environment variables (.env) or a secret manager.",
    });
  }

  // =========================================================================
  // 10. SCORING AND RESULT CALCULATION
  // =========================================================================
  const issueCounts = issues.reduce(
    (counts, issue) => {
      counts[issue.severity] += 1;
      return counts;
    },
    { error: 0, warning: 0, info: 0 }
  );

  const issueImpact = Math.min(
    100,
    issues.reduce(
      (total, issue) =>
        total + (issue.severity === "error" ? 25 : issue.severity === "warning" ? 10 : 3),
      0
    )
  );

  const score = Math.max(0, 100 - issueImpact);

  let summaryText = "";
  if (issues.length === 0) {
    summaryText = "Code analysis complete: No syntax errors, security flaws, or bad practices detected. The snippet looks clean!";
  } else {
    summaryText = `Found ${issues.length} issue${issues.length === 1 ? "" : "s"} (${issueCounts.error} error${issueCounts.error === 1 ? "" : "s"}, ${issueCounts.warning} warning${issueCounts.warning === 1 ? "" : "s"}, ${issueCounts.info} info). See the detailed findings below to see where your code was wrong and check the recommended fix.`;
  }

  return {
    score,
    issueImpact,
    issueCounts,
    summary: summaryText,
    issues,
    fixedCode: fixed,
  };
}

export function fixCode(language: string, code: string) {
  return reviewCode(language, code).fixedCode;
}
