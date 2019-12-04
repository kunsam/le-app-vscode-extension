// class ActionCompletitionProvider implements vscode.CompletionItemProvider {
//   provideCompletionItems(): vscode.ProviderResult<
//     vscode.CompletionItem[] | vscode.CompletionList
//   > {
//     return new Promise(resolve => {
//       const item = new vscode.CompletionItem(
//         "le_at_generate: " + "AppAction",
//         vscode.CompletionItemKind.Class
//       );
//       item.detail = "LeTote New Action";
//       item.insertText = "insertText"
//       resolve([item]);
//     });
//   }
// }
// context.subscriptions.push(
//   vscode.languages.registerCompletionItemProvider(
//     [
//       { scheme: "file", language: "typescript" },
//       { scheme: "file", language: "javascript" },
//       { scheme: "file", language: "javascriptreact" },
//       { scheme: "file", language: "typescriptreact" }
//     ],
//     new ActionCompletitionProvider(),
//     "leatg"
//   )
// );
