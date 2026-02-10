import { INSERT_DIAGRAM_COMMAND, InsertDiagramPayload } from '@repo/editor/plugins/DiagramPlugin';
import { useEffect, useState, memo, useCallback, useRef } from 'react';
import { $isDiagramNode } from '@repo/editor/nodes/DiagramNode';
import { getImageDimensions } from '@repo/editor/utils/nodeUtils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogHeader,
} from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';
import { ImageNode } from '@repo/editor/nodes/ImageNode';
import { ALERT_COMMAND, ANNOUNCE_COMMAND } from '@repo/editor/commands';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions } from '@repo/editor/store';
import { restoreFocus } from '@repo/editor/utils/restoreFocus';
import { NAVIGATION_BLOCKED_EVENT, setShouldBlockNavigation } from '@repo/shared/navigation';
import { useTheme } from '@repo/ui/theme/theme-provider';

/**
 * Type definitions for draw.io (diagrams.net) embed API messages
 * Based on the embed API protocol documented at https://github.com/jgraph/drawio
 *
 * The embed API uses postMessage for communication between the parent window
 * and the draw.io iframe. Messages are sent as JSON strings.
 */

/**
 * Format options for diagram export
 */
export type DrawioFormat = 'xml' | 'xmlpng' | 'xmlsvg' | 'svg' | 'png' | 'jpg';

/**
 * UI theme options for draw.io
 */
export type DrawioUI = 'atlas' | 'min' | 'kennedy' | 'dark' | 'sketch';

/**
 * Configuration object for draw.io editor
 * This is passed to the editor and can contain various draw.io configuration options
 */
export interface DrawioConfig {
  [key: string]: unknown;
}

/**
 * Messages sent TO draw.io (parent -> iframe)
 */
export type DrawioOutgoingMessage =
  | DrawioConfigureMessage
  | DrawioLoadMessage
  | DrawioExportMessage;

/**
 * Configure message - sends configuration to draw.io
 */
export interface DrawioConfigureMessage {
  action: 'configure';
  config: DrawioConfig;
}

/**
 * Load message - loads a diagram into the editor
 */
export interface DrawioLoadMessage {
  action: 'load';
  autosave?: 0 | 1;
  saveAndExit?: '0' | '1';
  modified?: 'unsavedChanges' | '0';
  xml?: string;
  url?: string;
}

/**
 * Export message - requests export of the diagram
 */
export interface DrawioExportMessage {
  action: 'export';
  format: DrawioFormat;
  xml: string;
  spinKey?: string;
}

/**
 * Messages received FROM draw.io (iframe -> parent)
 */
export type DrawioIncomingMessage =
  | DrawioErrorMessage
  | DrawioConfigureEventMessage
  | DrawioInitEventMessage
  | DrawioAutosaveEventMessage
  | DrawioExportEventMessage
  | DrawioSaveEventMessage
  | DrawioExitEventMessage;

/**
 * Error message from draw.io
 */
export interface DrawioErrorMessage {
  error: string;
  data?: unknown;
}

/**
 * Configure event - editor is ready to receive configuration
 */
export interface DrawioConfigureEventMessage {
  event: 'configure';
}

/**
 * Init event - editor has been initialized
 */
export interface DrawioInitEventMessage {
  event: 'init';
}

/**
 * Autosave event - diagram has been auto-saved
 */
export interface DrawioAutosaveEventMessage {
  event: 'autosave';
  xml: string;
}

/**
 * Export event - diagram export is complete
 */
export interface DrawioExportEventMessage {
  event: 'export';
  data: string; // The exported data (SVG, PNG, etc.)
  xml: string; // The XML representation of the diagram
}

/**
 * Save event - diagram has been saved
 */
export interface DrawioSaveEventMessage {
  event: 'save';
  xml: string;
  exit?: boolean; // Whether the editor should exit after save
}

/**
 * Exit event - user requested to exit the editor
 */
export interface DrawioExitEventMessage {
  event: 'exit';
  modified?: boolean; // Whether the diagram was modified
  xml?: string; // The current XML if modified
}

/**
 * Type guard to check if a message is an error message
 */
export function isDrawioErrorMessage(msg: unknown): msg is DrawioErrorMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'error' in msg &&
    typeof (msg as DrawioErrorMessage).error === 'string'
  );
}

/**
 * Type guard to check if a message is an event message
 */
export function isDrawioEventMessage(
  msg: unknown,
): msg is Exclude<DrawioIncomingMessage, DrawioErrorMessage> {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'event' in msg &&
    typeof (msg as { event: string }).event === 'string' &&
    !isDrawioErrorMessage(msg)
  );
}

export interface DiagramEditorConfig {
  format?: DrawioFormat;
  ui?: DrawioUI;
  libraries?: boolean;
  config?: DrawioConfig;
  dark?: boolean;
}

export interface DiagramEditorCallbacks {
  onInitialized?: () => void;
  onSave?: (xml: string, draft: boolean) => void;
  onExport?: (data: string) => void;
  onExit?: () => void;
}

export class DiagramEditor {
  private frame: HTMLIFrameElement | null = null;
  private format: DrawioFormat = 'xmlsvg';
  private data: string = '';
  private xml: string | null = null;
  private config: DiagramEditorConfig;
  private callbacks: DiagramEditorCallbacks;
  private drawDomain = 'https://embed.diagrams.net/';
  private customContainer: HTMLElement | null = null;
  private pendingExport = false;

  constructor(config: DiagramEditorConfig = {}, callbacks: DiagramEditorCallbacks = {}) {
    this.config = {
      format: 'xmlsvg',
      ui: 'atlas',
      libraries: true,
      ...config,
    };
    this.callbacks = callbacks;
    this.format = this.config.format || 'xmlsvg';
  }

  private handleMessageEvent = (evt: MessageEvent) => {
    // Security: Only accept messages from draw.io domain
    const allowedOrigins = [
      'https://embed.diagrams.net',
      'https://www.draw.io',
      'https://app.diagrams.net',
      'https://diagrams.net',
    ];

    if (!allowedOrigins.includes(evt.origin)) {
      return;
    }

    // Check if message is from our iframe
    if (this.frame != null && evt.source === this.frame.contentWindow) {
      if (evt.data && evt.data.length > 0) {
        try {
          const msg: unknown = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
          if (msg != null) {
            this.handleMessage(msg);
          }
        } catch (e) {
          console.error('DiagramEditor: Error parsing draw.io message:', e, evt.data);
        }
      }
    }
  };

  private handleMessage = (msg: unknown) => {
    // Type guard for error messages
    if (isDrawioErrorMessage(msg)) {
      console.error('DiagramEditor: Error from draw.io:', msg.error, msg.data);
      return;
    }

    // Type guard for event messages
    if (!isDrawioEventMessage(msg)) {
      return;
    }

    switch (msg.event) {
      case 'configure':
        this.configureEditor();
        break;
      case 'init':
        this.initializeEditor();
        break;
      case 'autosave': {
        const autosaveMsg = msg as DrawioAutosaveEventMessage;
        this.save(autosaveMsg.xml, true);
        this.xml = autosaveMsg.xml;

        // If we were waiting for XML to export, do it now
        if (this.pendingExport) {
          this.pendingExport = false;
          // Small delay to ensure XML is set
          setTimeout(() => this.requestExport(), 100);
        }
        break;
      }
      case 'export': {
        const exportMsg = msg as DrawioExportEventMessage;
        if (this.callbacks.onExport) {
          this.callbacks.onExport(exportMsg.data);
        }
        this.xml = null;
        break;
      }
      case 'save': {
        const saveMsg = msg as DrawioSaveEventMessage;
        this.save(saveMsg.xml, false);
        this.xml = saveMsg.xml;

        // If we're waiting for export, trigger it now
        if (this.pendingExport) {
          this.pendingExport = false;
          this.requestExport();
        } else if (saveMsg.exit) {
          // Handle exit after save
          this.handleExit(saveMsg);
        }
        break;
      }
      case 'exit': {
        const exitMsg = msg as DrawioExitEventMessage;
        this.handleExit(exitMsg);
        break;
      }
    }
  };

  private handleExit = (msg: DrawioSaveEventMessage | DrawioExitEventMessage) => {
    if (msg.event === 'save') {
      if (this.xml != null) {
        this.postMessage({
          action: 'export',
          format: this.format,
          xml: this.xml,
          spinKey: 'export',
        });
      } else {
        this.stopEditing();
        if (this.callbacks.onExit) {
          this.callbacks.onExit();
        }
      }
    } else {
      // Only DrawioExitEventMessage has the 'modified' property
      const isExitEvent = msg.event === 'exit';
      const exitMsg = isExitEvent ? (msg as DrawioExitEventMessage) : null;

      if (exitMsg && (exitMsg.modified == null || exitMsg.modified)) {
        const xml = exitMsg.xml || this.xml || '';
        this.save(xml, false);
      } else if (!isExitEvent) {
        // For save events, always save
        const saveMsg = msg as DrawioSaveEventMessage;
        this.save(saveMsg.xml, false);
      }
      this.stopEditing();
      if (this.callbacks.onExit) {
        this.callbacks.onExit();
      }
    }
  };

  private postMessage = (msg: DrawioOutgoingMessage) => {
    if (this.frame != null && this.frame.contentWindow) {
      this.frame.contentWindow.postMessage(JSON.stringify(msg), '*');
    }
  };

  private configureEditor = () => {
    if (this.config.config) {
      this.postMessage({ action: 'configure', config: this.config.config });
    }
  };

  private initializeEditor = () => {
    // Determine if we have XML data or a URL
    const hasXml = this.data && this.data.length > 0 && this.data.startsWith('<');
    const hasUrl =
      this.data &&
      this.data.length > 0 &&
      !this.data.startsWith('<') &&
      !this.data.startsWith('data:');

    // Store initial XML if provided
    if (hasXml) {
      this.xml = this.data;
    } else if (!hasUrl) {
      // For new diagrams, start with empty XML - autosave will update it
      this.xml = '<mxfile><diagram></diagram></mxfile>';
    }

    // Load the diagram
    if (hasUrl) {
      this.postMessage({
        action: 'load',
        autosave: 1,
        saveAndExit: '1',
        modified: 'unsavedChanges',
        url: this.data,
      });
    } else if (hasXml && this.xml) {
      this.postMessage({
        action: 'load',
        autosave: 1,
        saveAndExit: '1',
        modified: 'unsavedChanges',
        xml: this.xml,
      });
    } else {
      const emptyXml = '<mxfile><diagram></diagram></mxfile>';
      this.xml = emptyXml;
      this.postMessage({
        action: 'load',
        autosave: 1,
        saveAndExit: '1',
        modified: 'unsavedChanges',
        xml: emptyXml,
      });
    }

    if (this.callbacks.onInitialized) {
      this.callbacks.onInitialized();
    }
  };

  private save = (data: string, draft: boolean) => {
    if (this.callbacks.onSave) {
      this.callbacks.onSave(data, draft);
    }
  };

  public startEditing = (data: string, format?: DrawioFormat) => {
    if (this.frame == null) {
      window.addEventListener('message', this.handleMessageEvent);
      this.format = format || this.format;
      this.data = data;

      this.frame = this.createFrame(this.getFrameUrl(), this.getFrameStyle());

      // Append to custom container if set, otherwise to document.body
      if (this.customContainer) {
        this.customContainer.appendChild(this.frame);
      } else {
        document.body.appendChild(this.frame);
      }
    }
  };

  public stopEditing = () => {
    if (this.frame != null) {
      window.removeEventListener('message', this.handleMessageEvent);

      // Remove from wherever it was added
      const parent = this.frame.parentNode;
      if (parent) {
        parent.removeChild(this.frame);
      }

      this.frame = null;
    }
  };

  public requestExport = () => {
    // According to draw.io protocol, we need XML to export
    // If we don't have it yet, wait for autosave or use empty diagram
    if (this.xml == null || this.xml.length === 0) {
      this.pendingExport = true;
      const emptyDiagram = '<mxfile><diagram></diagram></mxfile>';
      this.xml = emptyDiagram;

      setTimeout(() => {
        if (this.pendingExport && this.xml === emptyDiagram) {
          this.pendingExport = false;
          this.requestExport();
        }
      }, 500);
      return;
    }

    this.postMessage({
      action: 'export',
      format: this.format,
      xml: this.xml,
      spinKey: 'export',
    });
  };

  public getXml(): string | null {
    return this.xml;
  }

  public loadXml = (xml: string) => {
    if (this.frame != null && this.frame.contentWindow) {
      this.xml = xml;
      this.postMessage({
        action: 'load',
        autosave: 1,
        saveAndExit: '1',
        modified: 'unsavedChanges',
        xml: xml,
      });
    }
  };

  private getFrameUrl = (): string => {
    let url = this.drawDomain + '?proto=json&spin=1';

    if (this.config.ui != null) {
      url += '&ui=' + this.config.ui;
    }

    if (this.config.libraries != null) {
      url += '&libraries=1';
    }

    if (this.config.config != null) {
      url += '&configure=1';
    }

    if (this.config.dark) {
      url += '&dark=1';
    }

    return url;
  };

  private getFrameStyle = (): string => {
    return (
      'position:absolute;border:0;width:100%;height:100%;left:' +
      document.body.scrollLeft +
      'px;top:' +
      document.body.scrollTop +
      'px;'
    );
  };

  private createFrame = (url: string, style: string): HTMLIFrameElement => {
    const frame = document.createElement('iframe');
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('style', style);
    frame.setAttribute('src', url);
    return frame;
  };

  public setFrameContainer = (container: HTMLElement) => {
    this.customContainer = container;

    // Override createFrame to use custom container styling
    const originalCreateFrame = this.createFrame.bind(this);
    this.createFrame = (url: string, style: string) => {
      const frame = originalCreateFrame(url, style);
      // Update style to work within our container
      frame.style.position = 'absolute';
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.left = '0';
      frame.style.top = '0';
      frame.style.border = '0';
      return frame;
    };
  };
}

function DiagramDialog({ node }: { node: ImageNode | null }) {
  const [editor] = useLexicalComposerContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramEditorRef = useRef<DiagramEditor | null>(null);
  const { mode } = useTheme();
  const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const resolvedMode = mode === 'system' ? systemMode : mode;
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { updateEditorStoreState, uploadImage, getImageSignedUrl } = useActions();

  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem('drawio');
  }, []);

  const saveToLocalStorage = useCallback((xml: string) => {
    if (!xml || xml.length === 0) return;
    const draft = {
      lastModified: new Date().toISOString(),
      xml: xml,
    };
    localStorage.setItem('drawio', JSON.stringify(draft));
    setHasUnsavedChanges(true);
  }, []);

  useEffect(() => {
    setShouldBlockNavigation(true);
    return () => {
      setShouldBlockNavigation(false);
    };
  }, []);

  const insertDiagram = useCallback(
    (payload: InsertDiagramPayload) => {
      if (!$isDiagramNode(node)) {
        editor.dispatchCommand(INSERT_DIAGRAM_COMMAND, payload);
      } else {
        editor.update(() => node.update(payload));
      }
    },
    [editor, node],
  );

  const closeDialog = useCallback(() => {
    if (diagramEditorRef.current) {
      diagramEditorRef.current.stopEditing();
      diagramEditorRef.current = null;
    }
    updateEditorStoreState('openDialog', null);
  }, [updateEditorStoreState]);

  const handleClose = useCallback(async () => {
    function discard() {
      clearLocalStorage();
      setHasUnsavedChanges(false);
      closeDialog();
    }
    function cancel() {
      closeDialog();
    }

    const unsavedDraft = localStorage.getItem('drawio');
    if (unsavedDraft || hasUnsavedChanges) {
      const alert = {
        title: 'Discard unsaved changes?',
        description: 'Are you sure you want to discard your unsaved changes?',
        confirmText: 'Discard',
        cancelText: 'Cancel',
        onConfirm: discard,
      };
      editor.dispatchCommand(ALERT_COMMAND, alert);
    } else {
      cancel();
    }
  }, [hasUnsavedChanges, editor, closeDialog, clearLocalStorage]);

  const processExportedDiagram = useCallback(
    async (data: string) => {
      try {
        const dimensions = await getImageDimensions(data);
        const showCaption = node?.getShowCaption() ?? true;
        const altText = node?.getAltText() ?? 'diagram';
        const id = node?.getId() ?? '';
        const style = node?.getStyle() ?? '';

        let payloadSrc: string = data;
        let signedUrl: string | undefined = undefined;

        try {
          // Convert SVG to blob/file
          const binaryString = atob(data.substring(data.indexOf(',') + 1));
          const bytes = Uint8Array.from(binaryString, (m) => m.codePointAt(0) ?? 0);
          const svg = new TextDecoder().decode(bytes);
          const blob = new Blob([svg], { type: 'image/svg+xml' });
          const file = new File([blob], `${altText}.svg`, {
            type: 'image/svg+xml',
          });

          const { data: uploadData, error } = await uploadImage(file);
          if (error || !uploadData) {
            throw new Error('Uploading diagram failed');
          }

          const filename = uploadData.path.split('/').pop()!;
          payloadSrc = `/images/${filename}`;
          const { data: signedUrlData } = await getImageSignedUrl(filename);
          signedUrl = signedUrlData?.signedUrl;
        } catch {
          editor.dispatchCommand(ANNOUNCE_COMMAND, {
            type: 'error',
            message: {
              title: 'Uploading diagram failed',
              subtitle: 'Please try again later',
            },
          });
        }

        restoreFocus(editor);
        insertDiagram({
          src: payloadSrc,
          signedUrl,
          showCaption,
          ...dimensions,
          altText,
          style,
          id,
        });
        clearLocalStorage();
        setHasUnsavedChanges(false);
        closeDialog();
      } catch (error) {
        console.error('Error processing exported diagram:', error);
        editor.dispatchCommand(ANNOUNCE_COMMAND, {
          type: 'error',
          message: {
            title: 'Processing diagram failed',
            subtitle: 'Please try again later',
          },
        });
      }
    },
    [node, editor, insertDiagram, closeDialog, uploadImage, getImageSignedUrl, clearLocalStorage],
  );

  const handleSubmit = useCallback(() => {
    const diagramEditor = diagramEditorRef.current;
    if (diagramEditor && isInitialized) {
      diagramEditor.requestExport();
    }
  }, [isInitialized]);

  // Initialize diagram editor - wait for container to be ready
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      // Get initial data from node's src property
      let initialData = '';

      if (node && $isDiagramNode(node)) {
        const src = node.getSignedUrl() || node.getSrc();
        if (src) {
          const response = await fetch(src, {
            credentials: 'include',
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch diagram: ${response.statusText}`);
          }
          const data = await response.text();
          const svg = new DOMParser().parseFromString(data, 'image/svg+xml').documentElement;
          initialData = svg.getAttribute('content') || '';
        }
      }

      // Create diagram editor instance
      const diagramEditor = new DiagramEditor(
        {
          format: 'xmlsvg',
          ui: 'atlas',
          libraries: true,
          dark: resolvedMode === 'dark',
        },
        {
          onInitialized: () => {
            setIsInitialized(true);
          },
          onSave: (xml: string, draft: boolean) => {
            if (draft) {
              saveToLocalStorage(xml);
            }
          },
          onExport: (data: string) => {
            processExportedDiagram(data);
          },
          onExit: () => {
            handleClose();
          },
        },
      );

      diagramEditorRef.current = diagramEditor;
      diagramEditor.setFrameContainer(container);

      // Check for localStorage draft before starting
      const unsavedDraft = localStorage.getItem('drawio');
      if (unsavedDraft) {
        try {
          const draft = JSON.parse(unsavedDraft);
          const lastModified = new Date(draft.lastModified);
          const alert = {
            title: 'Restore unsaved changes?',
            description: `You have unsaved changes from ${lastModified.toLocaleString()}. Do you want to restore them?`,
            confirmText: 'Restore',
            cancelText: 'Discard',
            onConfirm: () => {
              diagramEditor.startEditing(draft.xml);
            },
            onCancel: () => {
              clearLocalStorage();
              diagramEditor.startEditing(initialData);
            },
          };
          editor.dispatchCommand(ALERT_COMMAND, alert);
        } catch (error) {
          console.error('Error parsing draft from localStorage:', error);
          clearLocalStorage();
          diagramEditor.startEditing(initialData);
        }
      } else {
        diagramEditor.startEditing(initialData);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (diagramEditorRef.current) {
        diagramEditorRef.current.stopEditing();
        diagramEditorRef.current = null;
      }
    };
  }, [resolvedMode, editor, clearLocalStorage]); // Reinitialize when mode changes

  useEffect(() => {
    const handleNavigationBlocked = () => {
      handleClose();
    };
    window.addEventListener(NAVIGATION_BLOCKED_EVENT, handleNavigationBlocked);
    return () => {
      window.removeEventListener(NAVIGATION_BLOCKED_EVENT, handleNavigationBlocked);
    };
  }, [handleClose]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        setShouldBlockNavigation(open);
        if (!open) handleClose();
      }}
    >
      <DialogContent
        className="flex flex-col gap-0 w-full max-w-full sm:max-w-full p-0 overflow-hidden absolute inset-0 h-screen !translate-0"
        style={{ animation: 'none', top: scrollY + 'px' }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleClose();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{node ? 'Edit Diagram' : 'Insert Diagram'}</DialogTitle>
          <DialogDescription>Create a diagram using draw.io.</DialogDescription>
        </DialogHeader>
        <div ref={containerRef} className="flex-1 overflow-hidden relative">
          {!isInitialized && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading diagram editor</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="m-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isInitialized}>
            {!node ? 'Insert' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default memo(DiagramDialog);
