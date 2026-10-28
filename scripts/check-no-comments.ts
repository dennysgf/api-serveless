import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

type Finding = {
  readonly file: string;
  readonly line: number;
};

const projectRoot = resolve(import.meta.dirname, '..');
const scannedDirectories = ['src', 'tests', 'scripts'];
const scannedRootFiles = ['eslint.config.mjs', 'vitest.config.ts'];
const scannedExtensions = new Set(['.ts', '.js', '.mjs']);
const ignoredDirectories = new Set(['node_modules', 'dist', 'coverage', '.aws-sam']);

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return ignoredDirectories.has(entry) ? [] : listSourceFiles(path);
    }
    return scannedExtensions.has(extname(path)) ? [path] : [];
  });

const collectLiteralEnds = (sourceFile: ts.SourceFile): Map<number, number> => {
  const literalEnds = new Map<number, number>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isRegularExpressionLiteral(node)
    ) {
      literalEnds.set(node.getStart(sourceFile), node.end);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return literalEnds;
};

const findCommentsInFile = (filePath: string): Finding[] => {
  const text = readFileSync(filePath, 'utf8');
  const scriptKind = extname(filePath) === '.ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);
  const literalEnds = collectLiteralEnds(sourceFile);
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    text,
  );
  const findings: Finding[] = [];

  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    const tokenStart = scanner.getTokenStart();
    const literalEnd = literalEnds.get(tokenStart);
    if (literalEnd !== undefined) {
      scanner.resetTokenState(literalEnd);
      continue;
    }
    if (
      kind === ts.SyntaxKind.SingleLineCommentTrivia ||
      kind === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      findings.push({
        file: relative(projectRoot, filePath),
        line: sourceFile.getLineAndCharacterOfPosition(tokenStart).line + 1,
      });
    }
  }
  return findings;
};

const sourceFiles = [
  ...scannedDirectories
    .map((directory) => join(projectRoot, directory))
    .filter((directory) => existsSync(directory))
    .flatMap(listSourceFiles),
  ...scannedRootFiles.map((file) => join(projectRoot, file)).filter((file) => existsSync(file)),
];

const findings = sourceFiles.flatMap(findCommentsInFile);

if (findings.length > 0) {
  for (const finding of findings) {
    process.stderr.write(`${finding.file}:${String(finding.line)}: comment found\n`);
  }
  process.stderr.write(
    `Comments are not allowed in source code (${String(findings.length)} found).\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(`No comments found in ${String(sourceFiles.length)} source files.\n`);
}
