import { generatePositionKeyBetween } from '../utils/position';

export interface TreeNodeData {
  id: string;
  parentId?: string | null;
  position?: string | null;
  [key: string]: any;
}

export interface SerializedTreeNode<T extends TreeNodeData = TreeNodeData> {
  id: string;
  data: T;
  children: SerializedTreeNode<T>[];
}

export class TreeNode<T extends TreeNodeData = TreeNodeData> {
  id: string;
  data: T;
  children: TreeNode<T>[];
  parent: TreeNode<T> | null;

  constructor(data: T) {
    this.id = data.id;
    this.data = { ...data };
    this.children = [];
    this.parent = null;
  }

  /**
   * Adds a child node to this node
   */
  addChild(node: TreeNode<T>): TreeNode<T> {
    node.parent = this;
    this.children.push(node);
    return node;
  }

  /**
   * Removes a child node from this node
   */
  removeChild(nodeOrId: TreeNode<T> | string): TreeNode<T> | null {
    const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
    const index = this.children.findIndex((child) => child.id === id);
    if (index !== -1) {
      const [removed] = this.children.splice(index, 1);
      removed.parent = null;
      return removed;
    }
    return null;
  }

  /**
   * Finds a node by id in this subtree
   */
  findNodeById(id: string): TreeNode<T> | null {
    if (this.id === id) {
      return this;
    }

    for (const child of this.children) {
      const found = child.findNodeById(id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  findNodeByPredicate(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null {
    if (predicate(this)) {
      return this;
    }
    for (const child of this.children) {
      const found = child.findNodeByPredicate(predicate);
      if (found) {
        return found;
      }
    }
    return null;
  }

  getAncestors(): TreeNode<T>[] {
    const ancestors: TreeNode<T>[] = [];
    let current: TreeNode<T> | null = this.parent;
    while (current) {
      ancestors.push(current);
      current = current.parent;
    }
    return ancestors;
  }

  /**
   * Traverses the tree and applies a callback to each node
   */
  traverse(callback: (node: TreeNode<T>, depth: number) => void, depth = 0): void {
    callback(this, depth);
    this.children.forEach((child) => child.traverse(callback, depth + 1));
  }

  /**
   * Serializes the tree to a plain object
   */
  toJSON(): SerializedTreeNode<T> {
    return {
      id: this.id,
      data: { ...this.data },
      children: this.children.map((child) => child.toJSON()),
    };
  }

  /**
   * Converts the tree to a flat array
   */
  toArray(): T[] {
    const result: T[] = [];
    this.traverse((node) => {
      const nodeData = { ...node.data };
      if (node.parent) {
        nodeData.parentId = node.parent.id;
      }
      result.push(nodeData as T);
    });
    return result;
  }

  /**
   * Creates a deep clone of this tree
   */
  clone(): TreeNode<T> {
    const clone = new TreeNode<T>({ ...this.data });
    this.children.forEach((child) => {
      const childClone = child.clone();
      clone.addChild(childClone);
    });
    return clone;
  }
}

/**
 * Creates a tree from a serialized object
 */
export function jsonToTree<T extends TreeNodeData>(obj: any): TreeNode<T> {
  const node = new TreeNode<T>(obj.data as T);
  if (Array.isArray(obj.children)) {
    obj.children.forEach((childObj: any) => {
      const childNode = jsonToTree<T>(childObj);
      node.addChild(childNode);
    });
  }
  return node;
}

/**
 * Converts a flat array of items with parentId references into a tree structure
 */
export function arrayToTree<T extends TreeNodeData>(items: T[]): TreeNode<T> {
  // Create a map of all items by their id
  const itemMap = new Map<string, TreeNode<T>>();

  // Create all nodes first
  items.forEach((item) => {
    itemMap.set(item.id, new TreeNode<T>(item));
  });

  // Create a root node and attach all top-level nodes
  const rootNodes: TreeNode<T>[] = [];

  // Connect parent-child relationships
  items.forEach((item) => {
    const node = itemMap.get(item.id)!;

    if (item.parentId && itemMap.has(item.parentId)) {
      // Add as child to parent
      const parent = itemMap.get(item.parentId)!;
      parent.addChild(node);
    } else {
      // This is a root node
      if (!item.parentId) rootNodes.push(node);
    }
  });

  const virtualRoot = new TreeNode<T>({ id: 'root' } as T);
  rootNodes.forEach((node) => virtualRoot.addChild(node));

  // traverse the tree and generate position keys for unordered nodes
  virtualRoot.traverse((node, depth) => {
    if (!node.data.position) {
      const siblings = depth === 0 ? rootNodes : (node.parent?.children ?? []);
      const index = siblings.findIndex((sibling) => sibling.id === node.id);
      node.data.position = generatePositionKeyBetween(
        siblings[index - 1]?.data.position,
        siblings[index]?.data.position,
      );
    }
  });

  sortChildrenByPosition(virtualRoot);

  return virtualRoot;
}

/**
 * Finds a node in the tree by predicate
 */
export function findNode<T extends TreeNodeData>(
  root: TreeNode<T>,
  predicate: (node: TreeNode<T>) => boolean,
): TreeNode<T> | null {
  if (predicate(root)) {
    return root;
  }

  for (const child of root.children) {
    const found = findNode(child, predicate);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Moves a node to a new parent
 */
export function moveNode<T extends TreeNodeData>(
  node: TreeNode<T>,
  newParent: TreeNode<T>,
): boolean {
  if (!node || !newParent) return false;
  if (node.parent === newParent) return true;

  // Check if newParent is a descendant of node (to avoid cycles)
  let ancestor: TreeNode<T> | null = newParent;
  while (ancestor) {
    if (ancestor === node) return false;
    ancestor = ancestor.parent;
  }

  // Remove from current parent
  if (node.parent) {
    node.parent.removeChild(node);
  }

  // Add to new parent
  newParent.addChild(node);
  return true;
}

export function sortChildrenByPosition<T extends TreeNodeData>(node: TreeNode<T>): void {
  node.children.sort((a, b) => {
    const posA = a.data.position || '';
    const posB = b.data.position || '';
    return posA < posB ? -1 : posA > posB ? 1 : 0;
  });
  node.children.forEach(sortChildrenByPosition);
}
