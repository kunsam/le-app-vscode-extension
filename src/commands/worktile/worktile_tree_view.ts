import * as vscode from "vscode";
import {
  WorkTileTaskNode,
  CommonUIViewNode,
  WorkTileTaskNodeType
} from "./typing";
import { WorkTileTaskProvider } from "./task_provider";

export const WorkTileTreeName = "LeAppPlugin";

export class WorkTileTaskTree
  implements vscode.TreeDataProvider<CommonUIViewNode> {
  private _node_tree: CommonUIViewNode[] = [];
  private _worktile_tasks: WorkTileTaskNode[];
  private _onDidChangeTreeData: vscode.EventEmitter<
    CommonUIViewNode | undefined
  > = new vscode.EventEmitter<CommonUIViewNode | undefined>();
  readonly onDidChangeTreeData: vscode.Event<
    CommonUIViewNode | undefined
  > = this._onDidChangeTreeData.event;

  constructor(worktile_tasks: WorkTileTaskNode[]) {
    // console.log(worktile_tasks, "worktile_tasks");
    this._worktile_tasks = worktile_tasks;
    let demands: CommonUIViewNode[] = [];
    let bugs: CommonUIViewNode[] = [];
    let others: CommonUIViewNode[] = [];
    worktile_tasks.forEach(task => {
      const current_node = {
        id: task.id,
        children: [],
        _origin: task,
        text: task.title
      };
      current_node.children = this._recursiveGetParentTreeNode(
        task.parent,
        current_node
      );
      if (task.type === WorkTileTaskNodeType.demand) {
        demands.push(current_node);
        return;
      }
      if (task.type === WorkTileTaskNodeType.bug) {
        bugs.push(current_node);
        return;
      }
      others.push(current_node);
    });
    this._node_tree.push({
      id: "bug",
      children: bugs,
      text: "敏捷缺陷",
      _origin: null
    });
    this._node_tree.push({
      id: "demands",
      children: demands,
      text: "敏捷需求",
      _origin: null
    });
    this._node_tree.push({
      id: "others",
      children: others,
      text: "其它任务",
      _origin: null
    });
  }

  private _recursiveGetParentTreeNode(
    node?: WorkTileTaskNode,
    parent?: CommonUIViewNode
  ): CommonUIViewNode[] {
    if (!node) return [];
    const _node: CommonUIViewNode = {
      parent,
      id: node.id,
      text: node.title,
      _origin: node,
      children: []
    };
    _node.children = this._recursiveGetParentTreeNode(node.parent, _node);
    return [_node];
  }

  public getParent(element: CommonUIViewNode) {
    return element.parent;
  }

  public getChildren(element: CommonUIViewNode) {
    if (!element) return this._node_tree;
    return element.children || [];
  }
  public getTreeItem(element: CommonUIViewNode): vscode.TreeItem {
    return {
      label: element.text,
      collapsibleState:
        element.children && element.children.length
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
    };
  }
  public refresh() {
    this._onDidChangeTreeData.fire();
  }
}

export class WorkTileTreeView {
  private _view: vscode.TreeView<CommonUIViewNode>;
  private _treeDataProvider: WorkTileTaskTree;
  private _provider: WorkTileTaskProvider;
  constructor() {
    this._provider = new WorkTileTaskProvider();
  }
  public init() {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "初始化...",
        cancellable: true
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          console.log("User canceled the long running operation");
        });
        return new Promise(resolve => {
          this._provider.apiGetMyTasks(progress).then(worktile_tasks => {
            this._treeDataProvider = new WorkTileTaskTree(worktile_tasks);
            this._view = vscode.window.createTreeView(WorkTileTreeName, {
              treeDataProvider: this._treeDataProvider,
              showCollapseAll: true
            });
            this._view.onDidChangeSelection(e => {
              e.selection.forEach(data => {
                console.log("onDidChangeSelection");
              });
            });
            resolve();
          });
        });
      }
    );
  }

  public refresh() {
    if (this._treeDataProvider) {
      this._treeDataProvider.refresh();
    } else {
      this.init();
    }
  }

  public reset() {
    return this.init();
  }
}
