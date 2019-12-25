import * as vscode from "vscode";
import { Commands, HelpCommands, SearchableCommand } from "./config";

export class SearchEngineCommands {
  constructor(context: vscode.ExtensionContext) {
    this.initCommands(context);
  }

  showAndExcuteCommands(commands: SearchableCommand[]) {
    const maxCommandName = Math.max(...commands.map(c => c.name.length));
    vscode.window
      .showQuickPick(
        commands.map((c, cindex) => {
          let labelText = `${cindex + 1}.${c.name}`;
          for (let i = maxCommandName - c.name.length; i > 0; i--) {
            labelText += "    ";
          }
          labelText += `        ${c.tags.join(",")}`;
          return {
            id: c.id,
            label: labelText
          };
        }),
        {
          placeHolder: "选择需要的命令"
        }
      )
      .then(result => {
        if (result && result.id) {
          vscode.commands.executeCommand(result.id);
        }
      });
  }

  initCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.openExtensionSearchEgnine",
        () => {
          this.showAndExcuteCommands(Commands);
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("LeAppPlugin.checkHelp", () => {
        this.showAndExcuteCommands(HelpCommands);
      })
    );
  }
}
