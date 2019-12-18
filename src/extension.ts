"use strict";
import * as vscode from "vscode";
import NavigatorsCommand from "./commands/router";
import { PluginTreeDataProvider } from "./treeprovider";
import WorktileCommand from "./commands/worktile";
import { CoderCommand } from './commands/coder/coder'

export async function activate(context: vscode.ExtensionContext) {
  const navigatorsCommand = new NavigatorsCommand(context);
  new WorktileCommand(context, navigatorsCommand);
  new CoderCommand(context);
  // new AdminWebviewPanelCommands(context);
  // 暂时不用这个，直接用我起的 admin 去用就好了
  context.subscriptions.push(
    vscode.commands.registerCommand("LeAppPlugin.openExternalAdmin", () => {
      vscode.env.openExternal(
        vscode.Uri.parse("http://10.0.1.40:4400/assets")
      );
    })
  );

  vscode.window.createTreeView("LeAppPlugin", {
    treeDataProvider: new PluginTreeDataProvider([
      {
        text: "welcome"
      }
    ]),
    showCollapseAll: true
  });
}
