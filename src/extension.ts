"use strict";
import * as vscode from "vscode";
import NavigatorsCommand from "./commands/router";
import { PluginTreeDataProvider } from "./treeprovider";
import WorktileCommand from "./commands/worktile";

export async function activate(context: vscode.ExtensionContext) {
  const navigatorsCommand = new NavigatorsCommand(context);
  new WorktileCommand(context, navigatorsCommand);

  vscode.window.createTreeView("LeAppPlugin", {
    treeDataProvider: new PluginTreeDataProvider([
      {
        text: "welcome"
      }
    ]),
    showCollapseAll: true
  });
}
