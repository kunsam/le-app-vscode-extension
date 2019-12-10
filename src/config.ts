import * as vscode from "vscode";
import { LeFileContentManagerConfig } from "le-ts-code-tool";

export const PROJECT_DIR = "/.le_app_plugin";

export const ROOT_PATH: string = vscode.workspace.workspaceFolders[0].uri.path;

export const CONTENT_MANAGER_CONFIG: LeFileContentManagerConfig = {
  projectDirPath: ROOT_PATH,
  folderPaths: ["src/", "storybook/stories"]
};
