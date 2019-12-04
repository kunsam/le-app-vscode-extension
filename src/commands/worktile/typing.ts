export interface WorkTileTaskProperties {
  title: string;
  desc: {
    value: string;
    updated_at: number;
  };
  fix: {
    value: string;
    updated_at: number;
  };
  comments: {
    content: string;
    updated_at: number;
  }[];
}

// 初始重要数据结构
export interface WorkTileTaskStandardNode {
  title: string;
  identifier: string; // DEV{identifier}
  parent: {
    id: string;
    title: string;
  };
}

export enum WorkTileTaskNodeType {
  other = "other",
  bug = "5caadf0d856a011d2987a16d", // 缺陷
  demand = "5caadf0d856a011d2987a151" // 需求
}

// 在worktile打开
export interface WorkTileTaskNode {
  id: string;
  type: string;
  title: string;
  tags: string[];
  parent?: WorkTileTaskNode;
  route_link: string; // 用于定位页面
  identifier: string; // 用于复制到剪切板中 搜索
  user?: {
    email: string;
    password: string;
  };
}

export interface CommonUIViewNode {
  id: string;
  text: string;
  parent?: CommonUIViewNode;
  _origin: WorkTileTaskNode;
  children: CommonUIViewNode[];
}
