import * as vscode from "vscode";
import { CatCodingPanel } from "./panel";

export class AdminWebviewPanelCommands {
  constructor(context: vscode.ExtensionContext) {
    this.init(context);
  }
  init(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand("LeAppPlugin.startAdminPanel", () => {
        CatCodingPanel.createOrShow(context.extensionPath);
      })
    );

    // context.subscriptions.push(
    //   vscode.commands.registerCommand("catCoding.doRefactor", () => {
    //     if (CatCodingPanel.currentPanel) {
    //       CatCodingPanel.currentPanel.doRefactor();
    //     }
    //   })
    // );

    if (vscode.window.registerWebviewPanelSerializer) {
      // Make sure we register a serializer in activation event
      vscode.window.registerWebviewPanelSerializer(CatCodingPanel.viewType, {
        async deserializeWebviewPanel(
          webviewPanel: vscode.WebviewPanel,
          state: any
        ) {
          console.log(`Got state: ${state}`);
          CatCodingPanel.revive(webviewPanel, context.extensionPath);
        }
      });
    }
  }
}
