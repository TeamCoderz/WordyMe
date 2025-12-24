'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { $getNodeStyleValueForProperty, $patchStyle } from '@repo/editor/utils/nodeUtils';
import { MathNode } from '@repo/editor/nodes/MathNode';
import ColorPicker, { backgroundPalette, textPalette } from '@repo/editor/components/color-picker';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui/components/dialog';
import { Textarea } from '@repo/ui/components/textarea';
import { Toggle } from '@repo/ui/components/toggle';
import { WolframIcon } from '@repo/editor/components/icons';
import { EditIcon, MenuIcon, Trash2Icon } from '@repo/ui/components/icons';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useSelector, useActions } from '@repo/editor/store';
import { createPortal } from 'react-dom';
import { COMMAND_PRIORITY_LOW } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import type { MathfieldElement } from 'mathlive';
import { FontSizePicker } from './FontSizePicker';
import {
  UPDATE_MATH_COLOR_COMMAND,
  UPDATE_MATH_FONT_SIZE_COMMAND,
  OPEN_MATH_EDIT_DIALOG_COMMAND,
  OPEN_WOLFRAM_COMMAND,
} from '@repo/editor/commands';

const anchorPolyfill = async (elements: HTMLElement[]) => {
  if (!('anchorName' in document.documentElement.style)) {
    const { default: polyfill } = await import('@oddbird/css-anchor-positioning/fn');

    polyfill({
      elements,
      excludeInlineStyles: false,
      useAnimationFrame: false,
    });
  }
};

function MathTools({ node }: { node: MathNode }) {
  const [editor] = useLexicalComposerContext();
  const fontColor = useSelector((state) => state.fontColor);
  const bgColor = useSelector((state) => state.bgColor);
  const { updateEditorStoreState } = useActions();
  const mathToolbarRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const mathfieldValueRef = useRef<HTMLTextAreaElement | null>(null);
  const mathfieldRef = useRef<MathfieldElement>(null);
  const [formData, setFormData] = useState({ value: node.getValue() });

  const $updateToolbar = useCallback(() => {
    if (node.isAttached()) {
      const mathfield = editor.getElementByKey(node.__key)
        ?.firstElementChild as MathfieldElement | null;
      if (!mathfield) return;
      const computedStyle = window.getComputedStyle(mathfield);
      const currentFontSize = computedStyle.getPropertyValue('font-size');
      const fontSize = $getNodeStyleValueForProperty(node, 'font-size', currentFontSize);
      updateEditorStoreState('fontSize', fontSize);
      if (mathfield.selectionIsCollapsed) {
        const color = $getNodeStyleValueForProperty(node, 'color');
        updateEditorStoreState('fontColor', color);
        const backgroundColor = $getNodeStyleValueForProperty(node, 'background-color');
        updateEditorStoreState('bgColor', backgroundColor);
      } else {
        const color =
          textPalette.find((color) => mathfield.queryStyle({ color }) === 'all') || null;
        updateEditorStoreState('fontColor', color);
        const backgroundColor =
          backgroundPalette.find(
            (backgroundColor) => mathfield.queryStyle({ backgroundColor }) === 'all',
          ) || null;
        updateEditorStoreState('bgColor', backgroundColor);
      }
    }
  }, [editor, node, updateEditorStoreState]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.read(() => {
        $updateToolbar();
      });
    });
  }, [editor, $updateToolbar]);

  const handleSelectionChange = useCallback(() => {
    editor.read(() => {
      $updateToolbar();
    });
  }, [editor, $updateToolbar]);

  useEffect(() => {
    const mathfield = editor
      .getElementByKey(node.__key)
      ?.querySelector('math-field') as MathfieldElement | null;
    if (!mathfield) return;
    mathfield.addEventListener('selection-change', handleSelectionChange);
    return () => {
      mathfield.removeEventListener('selection-change', handleSelectionChange);
    };
  }, [editor, $updateToolbar]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateToolbar();
    });
  }, [editor, $updateToolbar]);

  const deleteNode = useCallback(() => {
    editor.update(() => {
      node.selectPrevious();
      node.remove();
    });
  }, [editor, node]);

  const updateColor = useCallback(
    (key: string, value: string | null) => {
      editor.update(() => {
        node.select();
        $patchStyle(node, { [key]: value });
      });
    },
    [editor, node],
  );

  const updateFontSize = useCallback(
    (newFontSize: string) => {
      editor.update(() => {
        node.select();
        $patchStyle(node, { 'font-size': newFontSize });
      });
    },
    [editor, node],
  );

  const onColorChange = useCallback(
    (key: string, value: string | null) => {
      const mathfield = editor.getElementByKey(node.__key)
        ?.firstElementChild as MathfieldElement | null;
      if (!mathfield) return;
      if (mathfield.selectionIsCollapsed) {
        updateColor(key, value);
      } else {
        const operation = value ? 'set' : 'toggle';
        const style =
          key === 'color'
            ? { color: value || fontColor || undefined }
            : { backgroundColor: value || bgColor || undefined };
        const selection = mathfield.selection;
        const range = selection.ranges[0];
        mathfield.applyStyle(style, { range, operation });
      }

      if (key === 'color') {
        updateEditorStoreState('fontColor', value);
      } else {
        updateEditorStoreState('bgColor', value);
      }
    },
    [updateColor, node, fontColor, bgColor],
  );

  const openEditDialog = () => {
    setOpen(true);
  };

  useEffect(() => {
    if (!open) {
      restoreFocus();
      return;
    }
    setTimeout(() => {
      const textarea = mathfieldValueRef.current;
      if (!textarea) return;
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 0);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    restoreFocus();
  };

  const restoreFocus = () => {
    window.mathVirtualKeyboard.show({ animate: true });
    const mathfield = editor
      .getElementByKey(node.__key)
      ?.querySelector('math-field') as MathfieldElement | null;
    if (!mathfield) return;
    setTimeout(() => mathfield.focus(), 0);
  };

  useEffect(() => {
    setFormData({ value: node.getValue() });
  }, [node]);

  const updateFormData = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      e.target.focus();
      setFormData({ ...formData, [e.target.name]: e.target.value });
      if (mathfieldRef.current) {
        mathfieldRef.current.setValue(e.target.value);
      }
    },
    [formData],
  );

  const handleEdit = useCallback(
    (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const { value } = formData;
      const mathfield = editor
        .getElementByKey(node.__key)
        ?.querySelector('math-field') as MathfieldElement | null;
      if (!mathfield) return;
      mathfield.setValue(value, { selectionMode: 'after' });
      handleClose();
    },
    [editor, formData, handleClose, node],
  );

  const openWolfram = useCallback(() => {
    const mathfield = editor
      .getElementByKey(node.__key)
      ?.querySelector('math-field') as MathfieldElement | null;
    if (!mathfield) return;
    const selection = mathfield.selection;
    const value =
      mathfield.getValue(selection, 'latex-unstyled') || mathfield.getValue('latex-unstyled');
    window.open(`https://www.wolframalpha.com/input?i=${encodeURIComponent(value)}`);
  }, [node, editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        UPDATE_MATH_COLOR_COMMAND,
        (payload) => {
          onColorChange(payload.key, payload.value);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        UPDATE_MATH_FONT_SIZE_COMMAND,
        (newFontSize) => {
          updateFontSize(newFontSize);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        OPEN_MATH_EDIT_DIALOG_COMMAND,
        () => {
          openEditDialog();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        OPEN_WOLFRAM_COMMAND,
        () => {
          openWolfram();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateColor, updateFontSize, openEditDialog, openWolfram]);

  useLayoutEffect(() => {
    const mathToolbarElem = mathToolbarRef.current;
    if (mathToolbarElem === null) return;
    const mathElement = editor.getElementByKey(node.getKey());
    if (mathElement === null) return;

    (mathElement.style as any).anchorName = `--math-anchor-${node.getKey()}`;
    mathToolbarElem.setAttribute(
      'style',
      `position-anchor: --math-anchor-${node.getKey()}; bottom: calc(anchor(top) + 0.25rem); justify-self: anchor-center;`,
    );

    anchorPolyfill([mathElement, mathToolbarElem]);
  }, [node, editor]);

  return (
    <>
      <div
        ref={mathToolbarRef}
        className="math-toolbar flex px-4 absolute z-30 will-change-transform print:hidden gap-1"
      >
        <Toggle
          variant="outline"
          value="edit"
          aria-label="Edit Math"
          title="Edit Math"
          onClick={openEditDialog}
          className="bg-background"
        >
          <EditIcon />
        </Toggle>
        <Toggle
          variant="outline"
          value="wolfram"
          aria-label="Open Wolfram"
          title="Open Wolfram"
          onClick={openWolfram}
          className="bg-background hover:text-[#f96932]"
        >
          <WolframIcon />
        </Toggle>

        <FontSizePicker onBlur={restoreFocus} />

        <ColorPicker
          onColorChange={onColorChange}
          textColor={fontColor}
          backgroundColor={bgColor}
          aria-label="Math color"
          title="Math color"
        />
        <Toggle
          variant="outline"
          value="delete"
          aria-label="Delete Math"
          title="Delete Math"
          onClick={deleteNode}
          className="bg-background"
        >
          <Trash2Icon />
        </Toggle>
        <Toggle
          variant="outline"
          className="bg-background"
          value="menu"
          onFocus={restoreFocus}
          pressed={false}
          onClick={(e) => {
            const mathfield = editor
              .getElementByKey(node.__key)
              ?.querySelector('math-field') as MathfieldElement | null;
            if (!mathfield) return;
            try {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = rect.left;
              const y = rect.top + 40;
              mathfield.showMenu({
                location: { x, y },
                modifiers: {
                  alt: false,
                  control: false,
                  shift: false,
                  meta: false,
                },
              });
            } catch (error) {
              console.error('Failed to show math menu:', error);
            }
          }}
        >
          <MenuIcon />
        </Toggle>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit LaTeX</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-6">
            <Textarea
              id="value"
              value={formData.value}
              onChange={updateFormData}
              placeholder="Enter LaTeX"
              className="min-h-24"
              name="value"
              ref={mathfieldValueRef}
            />
            <div className="space-y-4">
              <h3 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
                Preview
              </h3>
              <div className="flex justify-center">
                <math-field
                  ref={mathfieldRef as any}
                  value={formData.value}
                  className="!w-auto"
                  read-only
                ></math-field>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleEdit}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function MathToolbar({
  node,
  anchorElem = document.querySelector('.editor-container') as HTMLElement,
}: {
  node: MathNode;
  anchorElem?: HTMLElement;
}) {
  return createPortal(<MathTools node={node} />, anchorElem);
}
