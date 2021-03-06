import * as fs from "fs";
import * as fse from "file-system";
import * as path from "path";
import * as vscode from "vscode";
import { ROOT_PATH, PROJECT_DIR, CONTENT_MANAGER_CONFIG } from "../../config";
import {
  pickFiles2Open,
  GotoTextDocument,
  vscodeInsertText
} from "../../extensionUtil";
import { ShowFileParentsInPickDataNode } from "./type";
import {
  NavigatorTree,
  LeTsCode,
  LeAppUtil,
  LeAppNavigator
} from "le-ts-code-tool";
import { SCREEN_TAGS } from "./screen_search_tag";

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
      // vscode.window.showInformationMessage("navigatorTree使用缓存");
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
          fs.unlinkSync(AllIMPORTS_CACHE_PATH);
          this.init();
        }
      )
    );
  }

  getFileParentsResult = (uri: vscode.Uri) => {
    const getResults = () => {
      const currentTime = new Date().getTime();
      const cacheResult = this._queryFilesResultCacheMap.get(uri.fsPath);
      if (cacheResult) {
        const deltaMinute =
          (currentTime - cacheResult.lastQueryTime) / (1000 * 600);
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
    return result;
  };

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
          const result = this.getFileParentsResult(uri);
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

    // 导航搜索 [从谁跳转过来的]
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

    // 查找当前文件路由容器
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.getCurrentFileScreenContainer",
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
          const name = this.navigatorTree.queryNavigatorNameByPath(uri.fsPath);
          if (name) {
            vscode.env.clipboard.writeText(name).then(() => {
              vscode.window.showInformationMessage("已复制到剪切板");
            });
          } else {
            const parentList = this.navigatorTree.getFileNodeParentsFlow(
              uri.fsPath
            );
            let result: { name: string; path: string }[] = [];
            parentList.forEach(list => {
              let hasResult = false;
              list.forEach(data => {
                if (hasResult) {
                  return;
                }
                const name = this.navigatorTree.queryNavigatorNameByPath(
                  data.fspath
                );
                if (name) {
                  hasResult = true;
                  result.push({
                    name: name,
                    path: data.fspath
                  });
                }
              });
            });
            pickFiles2Open(
              result.map(r => ({
                label: r.name,
                target: r.path
              }))
            );
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.debugCurrentFile",
        async () => {
          if (!this.navigatorTree) {
            await vscode.commands.executeCommand(
              "LeAppPlugin.activeRouterManager"
            );
          }
          const name = await this._getFileNavigationName();
          if (!name) {
            vscode.window.showErrorMessage("未找到结果");
            return;
          }
          const containerPath = path.join(
            ROOT_PATH,
            "src/containers/home/index.js"
          );
          let containerFileString = fs
            .readFileSync(containerPath, "utf-8")
            .replace(/\/\/\sDEBUG\-ANCHOR(.|\n)*\/\/\sDEBUG\-ANCHOR/g, "");

          const tabString = (index = 0) =>
            new Array(2 + index).fill(null).join("    ");
          let insertText = `\n${tabString(0)}// DEBUG-ANCHOR\n`;
          insertText += `${tabString(1)}if (1) {\n`;
          insertText += `${tabString(
            2
          )}this.props.navigation.navigate('${name}')\n`;
          insertText += `${tabString(2)}return\n`;
          insertText += `${tabString(1)}}\n`;
          insertText += `${tabString(0)}// DEBUG-ANCHOR\n`;
          const findStartIndex = containerFileString.indexOf(
            "componentDidMount"
          );
          let targetIndex = -1;
          if (findStartIndex > -1) {
            let matchTargetNumber = 0;
            for (let i = findStartIndex; i < containerFileString.length; i++) {
              if (containerFileString[i] === "}") {
                matchTargetNumber--;
                if (matchTargetNumber === 0) {
                  targetIndex = i;
                  break;
                }
              }
              if (containerFileString[i] === "{") {
                matchTargetNumber++;
              }
            }
          }
          if (targetIndex > -1) {
            targetIndex = targetIndex - 3; // 往前移动3位
            const pre = containerFileString.slice(0, targetIndex);
            const suf = containerFileString.slice(targetIndex);
            fs.writeFileSync(containerPath, `${pre}${insertText}${suf}`);
            return;
          }
          vscode.window.showErrorMessage("写入失败，请自行粘贴文字");
          vscode.env.clipboard.writeText(insertText).then(() => {
            GotoTextDocument(containerPath);
          });
        }
      )
    );

    this._registerSearchRouterByTagCommand(context);
  }

  _getFileNavigationName() {
    return new Promise(res => {
      const uri = vscode.window.activeTextEditor.document.uri;
      if (!uri) {
        vscode.window.showInformationMessage("不存在打开的文档");
        res("");
        return;
      }
      const name = this.navigatorTree.queryNavigatorNameByPath(uri.fsPath);
      if (name) {
        res(name);
        return;
      }
      const parentList = this.navigatorTree.getFileNodeParentsFlow(uri.fsPath);
      let result: { name: string; path: string }[] = [];
      parentList.forEach(list => {
        let hasResult = false;
        list.forEach(data => {
          if (hasResult) {
            return;
          }
          const name = this.navigatorTree.queryNavigatorNameByPath(data.fspath);
          if (name) {
            hasResult = true;
            result.push({
              name: name,
              path: data.fspath
            });
          }
        });
      });
      pickFiles2Open(
        result.map(r => ({
          label: r.name,
          target: r.path
        })),
        false,
        "",
        {
          onPick: result => {
            res(result.label);
          }
        }
      );
    });
  }

  _registerSearchRouterByTagCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeAppPlugin.SearchRouterByTag",
        async () => {
          if (!this.navigatorTree) {
            await vscode.commands.executeCommand(
              "LeAppPlugin.activeRouterManager"
            );
          }
          const tag = await vscode.window.showInputBox({
            placeHolder: "请输入文字"
          });
          let resultList = [];
          let resultListMap = new Map();
          if (tag) {
            SCREEN_TAGS.forEach(data => {
              data.tags.forEach(dtag => {
                if (dtag.includes(tag)) {
                  if (resultListMap.has(data.screen)) {
                    return;
                  }
                  resultListMap.set(data.screen, true);
                  resultList.push({
                    label: data.screen,
                    target: this.navigatorTree.queryNavigatorByName(data.screen)
                  });
                }
              });
            });
          }
          pickFiles2Open(
            resultList.filter(r => !!r.target),
            false,
            undefined,
            {
              onPick: result => {
                vscodeInsertText(x => `navigation.navigate('${result.label}')`);
              }
            }
          );
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
