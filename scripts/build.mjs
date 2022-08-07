// @ts-check
import ts from "typescript";
const message = "✨ Done in ";
console.time(message);
const cwd = process.cwd();
/**
 * @param {string} message
 * @returns {never}
 */
function die(message) {
  throw new Error(message);
}
function tsc() {
  /** @type {ts.ParseConfigFileHost} */
  // @ts-expect-error
  const host = ts.sys;
  const configFile = ts.findConfigFile(cwd, ts.sys.fileExists);
  if (!configFile) {
    return die("Cannot find tsconfig.json.");
  }
  const parsed = ts.getParsedCommandLineOfConfigFile(configFile, {}, host);
  if (!parsed) {
    return die("Invalid tsconfig file.");
  }
  const { options, fileNames, projectReferences } = parsed;
  const compiler = ts.createCompilerHost(parsed.options);
  const program = ts.createProgram({
    rootNames: fileNames,
    options,
    projectReferences,
    host: compiler,
  });
  /** @type {ts.TransformerFactory<ts.SourceFile>} */
  const factory = (context) => {
    return (root) => {
      return ts.visitNode(root, function visit(node) {
        if (ts.isImportDeclaration(node)) {
          const { assertClause, decorators, importClause, modifiers, moduleSpecifier } = node;
          if (ts.isStringLiteral(moduleSpecifier)) {
            const { text } = moduleSpecifier;
            return ts.factory.createImportDeclaration(
              decorators,
              modifiers,
              importClause,
              ts.factory.createStringLiteral(text + ".js", false),
              assertClause
            );
          }
        }
        if (ts.isExportDeclaration(node)) {
          const { assertClause, decorators, exportClause, modifiers, moduleSpecifier, isTypeOnly } = node;
          if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
            const { text } = moduleSpecifier;
            return ts.factory.createExportDeclaration(
              decorators,
              modifiers,
              isTypeOnly,
              exportClause,
              ts.factory.createStringLiteral(text + ".js", false),
              assertClause
            );
          }
        }
        return ts.visitEachChild(node, visit, context);
      });
    };
  };
  const { diagnostics } = program.emit(undefined, undefined, undefined, undefined, {
    after: [factory],
  });
  for (const diagnostic of diagnostics) {
    console.error(diagnostic.messageText);
  }
}
tsc();
console.timeEnd(message);
