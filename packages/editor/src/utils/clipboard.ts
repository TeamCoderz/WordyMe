import {
  $getSelection,
  $isDecoratorNode,
  $isNodeSelection,
  $isRangeSelection,
  COPY_COMMAND,
  CUT_COMMAND,
  PASTE_COMMAND,
  $getEditor,
  SerializedLexicalNode,
  LexicalEditor,
} from 'lexical';
import {
  $generateJSONFromSelectedNodes,
  $generateNodesFromSerializedNodes,
  $insertGeneratedNodes,
} from '@lexical/clipboard';
import { ANNOUNCE_COMMAND } from '@repo/editor/commands';

/**
 * Reads a text file from the system file picker
 */
export function readTextFileFromSystem(callback: (text: string) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.wordy,.txt,.md,.markdown,.text';
  input.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;

    if (target.files) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');

      reader.onload = (readerEvent) => {
        if (readerEvent.target) {
          const content = readerEvent.target.result;
          callback(content as string);
        }
      };
    }
  });
  input.click();
}

/**
 * Exports data as a blob download
 */
export function exportBlob(data: { nodes: SerializedLexicalNode[] }, fileName?: string) {
  const a = document.createElement('a');
  const body = document.body;

  if (body === null) {
    return;
  }

  body.appendChild(a);
  a.style.display = 'none';
  const json = JSON.stringify(data);
  const blob = new Blob([json], {
    type: 'octet/stream',
  });
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName ?? `${Date.now()}.wordy`;
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

/**
 * Exports nodes from the editor (selected nodes or all top-level nodes)
 */
export function $exportNodes(): SerializedLexicalNode[] {
  const editor = $getEditor();
  const selection = $getSelection();
  const data = $generateJSONFromSelectedNodes(editor, selection);
  return data.nodes;
}

/**
 * Imports nodes into the editor at the current selection
 */
export function $importNodes(data: { nodes: SerializedLexicalNode[] }) {
  const editor = $getEditor();
  if (!editor) return;
  const selection = $getSelection();
  if (!selection) return;
  const nodes = $generateNodesFromSerializedNodes(data.nodes);
  return $insertGeneratedNodes(editor, nodes, selection);
}

/**
 * Handles cut operation
 */
export function handleCut(editor: LexicalEditor) {
  editor.update(() => {
    editor.dispatchCommand(CUT_COMMAND, null);
  });
}

/**
 * Handles copy operation
 */
export function handleCopy(editor: LexicalEditor) {
  editor.update(() => {
    editor.dispatchCommand(COPY_COMMAND, null);
  });
}

/**
 * Handles paste operation with full clipboard data
 */
export async function handlePaste(editor: LexicalEditor) {
  try {
    const permission = await navigator.permissions.query({
      // @ts-expect-error These types are incorrect.
      name: 'clipboard-read',
    });

    if (permission.state === 'denied') {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        type: 'error',
        message: {
          title: 'Permission Denied',
          subtitle: "Couldn't read the clipboard.",
        },
      });
      return;
    }

    const data = new DataTransfer();
    const readClipboardItems = await navigator.clipboard.read();
    const item = readClipboardItems[0];

    for (const type of item.types) {
      const dataString = await (await item.getType(type)).text();
      data.setData(type, dataString);
    }

    const event = new ClipboardEvent('paste', {
      clipboardData: data,
    });

    editor.update(() => {
      editor.dispatchCommand(PASTE_COMMAND, event);
    });
  } catch {
    editor.dispatchCommand(ANNOUNCE_COMMAND, {
      type: 'error',
      message: {
        title: 'Something went wrong',
        subtitle: 'Failed to paste from clipboard.',
      },
    });
  }
}

/**
 * Handles paste operation with plain text only
 */
export async function handlePastePlainText(editor: LexicalEditor) {
  try {
    const permission = await navigator.permissions.query({
      // @ts-expect-error These types are incorrect.
      name: 'clipboard-read',
    });

    if (permission.state === 'denied') {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        type: 'error',
        message: {
          title: 'Permission Denied',
          subtitle: "Couldn't read the clipboard.",
        },
      });
      return;
    }

    const data = new DataTransfer();
    const clipboardText = await navigator.clipboard.readText();
    data.setData('text/plain', clipboardText);

    const event = new ClipboardEvent('paste', {
      clipboardData: data,
    });

    editor.update(() => {
      editor.dispatchCommand(PASTE_COMMAND, event);
    });
  } catch {
    editor.dispatchCommand(ANNOUNCE_COMMAND, {
      type: 'error',
      message: {
        title: 'Something went wrong',
        subtitle: 'Failed to paste from clipboard.',
      },
    });
  }
}

/**
 * Handles deletion of the current node
 */
export function handleDeleteNode(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const currentNode = selection.anchor.getNode();
      const ancestorNodeWithRootAsParent = currentNode.getParents().at(-2);

      ancestorNodeWithRootAsParent?.remove();
    } else if ($isNodeSelection(selection)) {
      const selectedNodes = selection.getNodes();
      selectedNodes.forEach((node) => {
        if ($isDecoratorNode(node)) {
          node.remove();
        }
      });
    }
  });
}
