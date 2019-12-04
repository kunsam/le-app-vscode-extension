import * as vscode from "vscode";

export type KC_RouterInfo = {
  pathname: string;
  query: {
    key?: string;
  };
};

export enum KC_NODE_ICON_TYPE {
  text = "text",
  node = "node",
  result = "result",
  file = "file"
}

export type KC_Node = {
  // 如果全局存在多个symbol最好指定 文件 filePattern
  symbol?: string; // 没有symbol 仅显示文字，点击没用    react项目中可能symbol 会相同
  // 多次出现以第一个为准
  text: string;

  document?: string;
  children?: KC_Node[];

  routers?: string[]; // 对应的路由列表
  operationKeys?: string; // 会做一个操作表  在其他地方如谷歌拓展程序里查找对应的操作流，根据操作流执行，定位到具体的UI页面/组件

  textPattern?: string; // symbol + textPattern 模式找到调用处的位置，textPattern 可能会存在多个，#指定第几个
  filePattern?: string; // 唯一指定

  // 直接点位
  location?: vscode.Location;
  parent?: KC_Node;

  iconType?: KC_NODE_ICON_TYPE;
  requirePath?: string; // 如果存在，这个是相对路径(__kReactCodeTree__/workflows/index.js) 使用 requirePath 加载children
  _id?: string; // 自动化生成后反向查找
};

export type SceneWorkflows = {
  title: string;
  list: KC_Node[];
};
