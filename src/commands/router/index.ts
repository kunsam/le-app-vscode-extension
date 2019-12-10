import * as fs from "fs";
import * as fse from "file-system";
import * as path from "path";
import * as vscode from "vscode";
import { ROOT_PATH, PROJECT_DIR, CONTENT_MANAGER_CONFIG } from "../../config";
import { pickFiles2Open, GotoTextDocument } from "../../extensionUtil";
import { ShowFileParentsInPickDataNode } from "./type";
import {
  NavigatorTree,
  LeTsCode,
  LeAppUtil,
  LeAppNavigator,
  LeFileContentManager
} from "le-ts-code-tool";

const AllIMPORTS_CACHE_PATH = path.join(
  ROOT_PATH,
  PROJECT_DIR,
  "/data-cache/all_router_imports.json"
);

const EXTRA_NAVIGATORS: LeTsCode.PathComponentPathPair[] = [
  {
    path: "Home",
    componentRelativePath: "src/containers/home/index.js"
  },
  {
    path: "Clothing",
    componentRelativePath: "src/containers/products/products_clothing.js"
  },
  {
    path: "Accessory",
    componentRelativePath: "src/containers/products/products_accessory.js"
  },
  {
    path: "Brands",
    componentRelativePath: "src/containers/brand/brands.js"
  },
  {
    path: "Totes",
    componentRelativePath: "src/containers/totes/index.js"
  },
  {
    path: "MyCloset",
    componentRelativePath: "src/containers/closet/index.js"
  },
  {
    path: "Account",
    componentRelativePath: "src/containers/account/index.js"
  },
  {
    path: "ProductsOccasion",
    componentRelativePath: "src/containers/products/product_occasion.js"
  },
  {
    path: "ClothingOccasion",
    componentRelativePath: "src/containers/products/product_occasion.js"
  },
  {
    path: "AccessoryOccasion",
    componentRelativePath: "src/containers/products/product_occasion.js"
  },
  {
    path: "WebPage",
    componentRelativePath: "src/containers/common/WebPage.js"
  }
];

export default class NavigatorsCommand {
  public navigatorTree: NavigatorTree;

  private _queryFilesResultCacheMap: Map<
    string,
    { result: ShowFileParentsInPickDataNode[]; lastQueryTime: number }
  > = new Map();

  private _fileNavigatorMap:
    | Map<string, { from: string[]; to: string[] }>
    | undefined;
  loadNavigators() {
    const navigators = LeAppUtil.ResolveNavigatorConfig(
      [path.join(ROOT_PATH, "src/navigation/index.js")],
      {
        projectRootPath: ROOT_PATH
      }
    );
    return navigators.concat(EXTRA_NAVIGATORS);
  }

  async init() {
    function getCacheAllImports() {
      if (fs.existsSync(AllIMPORTS_CACHE_PATH)) {
        const allImports: LeTsCode.FileImportResultWithClass[] = __non_webpack_require__(
          `${AllIMPORTS_CACHE_PATH}`
        );
        return allImports;
      }
      return undefined;
    }
    const cacheImports = getCacheAllImports();
    this.navigatorTree = new NavigatorTree(this.loadNavigators(), {
      projectDirPath: ROOT_PATH,
      getCacheAllImports: () => cacheImports,
      writeCacheAllImports: (
        allImports: LeTsCode.FileImportResultWithClass[]
      ) => {
        fse.writeFileSync(
          AllIMPORTS_CACHE_PATH,
          JSON.stringify(allImports, null, 2)
        );
      }
    });
    if (cacheImports) {
      vscode.window.showInformationMessage("navigatorTree使用缓存");
      await this.navigatorTree.initQueryMap();
    } else {
      vscode.window
        .withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "首次计算中...",
            cancellable: true
          },
          (_, token) => {
            token.onCancellationRequested(() => {
              console.log("User canceled the long running operation");
            });
            var p = new Promise(resolve => {
              this.navigatorTree.initQueryMap().then(() => {
                resolve();
              });
            });
            return p;
          }
        )
        .then(() => {
          vscode.window.showInformationMessage("激活成功!");
        });
    }
  }

  constructor(context: vscode.ExtensionContext) {
    this.initCommands(context);
    context.subscriptions.push(
      vscode.commands.registerCommand("LeAppPlugin.activeRouterManager", () => {
        if (!ROOT_PATH.includes("/app")) {
          return;
        }
        if (this.navigatorTree) {
          return;
        }
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "初始化中..."
          },
          () => {
            return new Promise(resolve => {
              this.init().then(() => {
                resolve();
              });
            });
          }
        );
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.refreshRouterManager",
        () => {
          this.navigatorTree = undefined;
          this.init();
        }
      )
    );
  }

  initCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.showFileParentsInPick",
        async () => {
          if (!this.navigatorTree) {
            await vscode.commands.executeCommand(
              "LeAppPlugin.activeRouterManager"
            );
          }

          const uri = vscode.window.activeTextEditor.document.uri;
          if (!uri) {
            vscode.window.showInformationMessage("不存在打开的文档");
            return;
          }
          const getResults = () => {
            const currentTime = new Date().getTime();
            const cacheResult = this._queryFilesResultCacheMap.get(uri.fsPath);
            if (cacheResult) {
              const deltaMinute =
                (currentTime - cacheResult.lastQueryTime) / (1000 * 60);
              if (deltaMinute < 30) {
                this._queryFilesResultCacheMap.delete(uri.fsPath);
              } else {
                if (cacheResult.result.length) {
                  return cacheResult.result;
                }
              }
            }
            const result = this.getFilesParentsResultShowInPick(uri);
            this._queryFilesResultCacheMap.set(uri.fsPath, {
              result,
              lastQueryTime: new Date().getTime()
            });
            return result;
          };
          const result = getResults();
          pickFiles2Open(
            result.map(r =>
              r.labelOnly
                ? { label: r.label, target: path.join(ROOT_PATH, r.path) }
                : {
                    target: path.join(ROOT_PATH, r.path),
                    label: `${new Array(r.depth).fill("    ").join("")}➡️${
                      r.path
                    }`
                  }
            ),
            false
          );
        }
      )
    );

    // 快捷键搜索
    context.subscriptions.push(
      vscode.commands.registerCommand("LeAppPlugin.SearchRouter", async () => {
        if (!this.navigatorTree) {
          await vscode.commands.executeCommand(
            "LeAppPlugin.activeRouterManager"
          );
        }
        const result: any = await vscode.window.showQuickPick(
          this.navigatorTree.navigators.map((r: LeAppNavigator) => ({
            label: r.name
          })),
          {
            placeHolder: "请输入pathname"
          }
        );

        if (result && result.label) {
          const fsPath = this.navigatorTree.queryNavigatorByName(result.label);
          GotoTextDocument(fsPath);
        }
      })
    );

    // 导航搜索
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.showNavigatorFromList",
        async () => {
          if (!this.navigatorTree) {
            await vscode.commands.executeCommand(
              "LeAppPlugin.activeRouterManager"
            );
          }
          const uri = vscode.window.activeTextEditor.document.uri;
          if (!uri) {
            vscode.window.showInformationMessage("不存在打开的文档");
            return;
          }
          const targetData = this.navigatorTree.queryFileNavigatorLinkList(
            uri.fsPath,
            CONTENT_MANAGER_CONFIG
          );
          if (targetData.from) {
            pickFiles2Open(
              targetData.from.map(f => ({
                label: `➡️${path.relative(ROOT_PATH, f)}`,
                target: f
              }))
            );
          } else {
            vscode.window.showInformationMessage("暂无结果!");
          }
        }
      )
    );

    // 进入导航模式
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.enterFileNavigatorMode",
        async () => {
          if (!this.navigatorTree) {
            await vscode.commands.executeCommand(
              "LeAppPlugin.activeRouterManager"
            );
          }
          const uri = vscode.window.activeTextEditor.document.uri;
          if (!uri) {
            vscode.window.showInformationMessage("不存在打开的文档");
            return;
          }
          // 向上找到全部父亲
          this._fileNavigatorMap = this.navigatorTree.getFileNavigatorLinkList(
            uri.fsPath,
            CONTENT_MANAGER_CONFIG
          );
          vscode.window.showInformationMessage("启动成功");
        }
      )
    );
    this._registerNavigatorModeCommands(context);
  }

  _registerNavigatorModeCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.NavigatorMode.enterLeft",
        async () => {
          const uri = vscode.window.activeTextEditor.document.uri;
          if (!uri) {
            vscode.window.showInformationMessage("不存在打开的文档");
            return;
          }
          if (!this._fileNavigatorMap) {
            vscode.window.showErrorMessage("请先在文件开启导航模式");
          } else {
            const data = this._fileNavigatorMap.get(uri.fsPath);
            if (data) {
              const list = data.from
                .map(f => ({
                  label: this.navigatorTree.queryNavigatorNameByPath(f),
                  target: f
                }))
                .filter(a => !!a.label);
              pickFiles2Open(list, true, "请选择要进入的Screen");
            } else {
              vscode.window.showErrorMessage("暂无导航图");
            }
          }
        }
      )
    );
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.NavigatorMode.enterRight",
        async () => {
          const uri = vscode.window.activeTextEditor.document.uri;
          if (!uri) {
            vscode.window.showInformationMessage("不存在打开的文档");
            return;
          }
          if (!this._fileNavigatorMap) {
            vscode.window.showErrorMessage("请先在文件开启导航模式");
          } else {
            const data = this._fileNavigatorMap.get(uri.fsPath);
            if (data) {
              const list = data.to
                .map(f => ({
                  label: this.navigatorTree.queryNavigatorNameByPath(f),
                  target: f
                }))
                .filter(a => !!a.label);
              pickFiles2Open(list, true, "请选择要进入的Screen");
            } else {
              vscode.window.showErrorMessage("暂无导航图");
            }
          }
        }
      )
    );
  }

  getFilesParentsResultShowInPick(uri: vscode.Uri) {
    const parents = this.navigatorTree.getFileNodeParentsFlow(uri.fsPath);
    const validFlows = parents.filter(p => p.length > 1);
    let result: ShowFileParentsInPickDataNode[] = [];
    validFlows.forEach((flow, index) => {
      flow.forEach((parent, pindex) => {
        if (pindex === 0) {
          result.push({
            depth: 0,
            labelOnly: true,
            path: "/" + parent.relativePath,
            label: `${index + 1}. -----------`
          });
        } else {
          result.push({
            depth: pindex,
            path: parent.relativePath
          });
        }
      });
    });
    return result;
  }
}
