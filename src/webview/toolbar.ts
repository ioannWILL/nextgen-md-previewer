import { Editor, editorViewCtx } from '@milkdown/core';
import { callCommand } from '@milkdown/utils';
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInBlockquoteCommand,
  turnIntoTextCommand,
  createCodeBlockCommand,
} from '@milkdown/preset-commonmark';
import {
  toggleStrikethroughCommand,
} from '@milkdown/preset-gfm';
import { undoCommand, redoCommand } from '@milkdown/plugin-history';

interface ToolbarButton {
  id: string;
  icon: string;
  title: string;
  shortcut?: string;
  action: () => void;
  isTextIcon?: boolean;
}

interface HeadingOption {
  level: number;
  label: string;
}

export class Toolbar {
  private toolbar: HTMLElement | null = null;
  private headingDropdown: HTMLElement | null = null;
  private isDropdownOpen = false;
  private editor: Editor;
  private buttons: Map<string, HTMLButtonElement> = new Map();

  constructor(editor: Editor) {
    this.editor = editor;
    this.createToolbar();
    this.setupActiveStateListener();
  }

  private createToolbar(): void {
    this.toolbar = document.createElement('div');
    this.toolbar.id = 'editor-toolbar';
    this.toolbar.className = 'toolbar';

    // Prevent toolbar clicks from deselecting text
    this.toolbar.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    // Create undo/redo button group
    const historyGroup = this.createButtonGroup([
      {
        id: 'undo',
        icon: '↩',
        title: 'Undo',
        shortcut: 'Ctrl+Z',
        action: () => this.undo(),
      },
      {
        id: 'redo',
        icon: '↪',
        title: 'Redo',
        shortcut: 'Ctrl+Shift+Z',
        action: () => this.redo(),
      },
    ]);

    // Create button group for formatting
    const formatGroup = this.createButtonGroup([
      {
        id: 'bold',
        icon: 'B',
        title: 'Bold',
        shortcut: 'Ctrl+B',
        action: () => this.toggleBold(),
      },
      {
        id: 'italic',
        icon: 'I',
        title: 'Italic',
        shortcut: 'Ctrl+I',
        action: () => this.toggleItalic(),
      },
      {
        id: 'strikethrough',
        icon: 'S',
        title: 'Strikethrough',
        shortcut: 'Ctrl+Shift+S',
        action: () => this.toggleStrikethrough(),
      },
      {
        id: 'code',
        icon: '{ }',
        title: 'Code Block',
        shortcut: 'Ctrl+`',
        action: () => this.toggleCodeBlock(),
        isTextIcon: true,
      },
    ]);

    // Create button group for links
    const linkGroup = this.createButtonGroup([
      {
        id: 'link',
        icon: '🔗',
        title: 'Link',
        shortcut: 'Ctrl+K',
        action: () => this.toggleLink(),
      },
    ]);

    // Create heading dropdown
    const headingContainer = this.createHeadingDropdown();

    // Create button group for block elements
    const blockGroup = this.createButtonGroup([
      {
        id: 'blockquote',
        icon: '❝',
        title: 'Blockquote',
        action: () => this.toggleBlockquote(),
      },
    ]);

    // Assemble toolbar
    this.toolbar.appendChild(historyGroup);
    this.toolbar.appendChild(this.createSeparator());
    this.toolbar.appendChild(formatGroup);
    this.toolbar.appendChild(this.createSeparator());
    this.toolbar.appendChild(linkGroup);
    this.toolbar.appendChild(this.createSeparator());
    this.toolbar.appendChild(headingContainer);
    this.toolbar.appendChild(this.createSeparator());
    this.toolbar.appendChild(blockGroup);

    // Insert toolbar at the beginning of body
    document.body.insertBefore(this.toolbar, document.body.firstChild);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isDropdownOpen && !this.headingDropdown?.contains(e.target as Node)) {
        this.closeHeadingDropdown();
      }
    });
  }

  private createButtonGroup(buttons: ToolbarButton[]): HTMLElement {
    const group = document.createElement('div');
    group.className = 'toolbar-group';

    buttons.forEach((btn) => {
      const button = document.createElement('button');
      button.className = 'toolbar-button';
      button.id = `toolbar-${btn.id}`;

      if (btn.isTextIcon) {
        button.textContent = btn.icon;
      } else {
        button.innerHTML = btn.icon;
      }

      button.title = btn.shortcut ? `${btn.title} (${btn.shortcut})` : btn.title;
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.action();
      });
      group.appendChild(button);

      this.buttons.set(btn.id, button);
    });

    return group;
  }

  private createSeparator(): HTMLElement {
    const separator = document.createElement('div');
    separator.className = 'toolbar-separator';
    return separator;
  }

  private createHeadingDropdown(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'heading-dropdown-container';

    const button = document.createElement('button');
    button.className = 'toolbar-button heading-button';
    button.innerHTML = 'P<span class="dropdown-arrow">▾</span>';
    button.title = 'Heading Level';
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleHeadingDropdown();
    });

    this.headingDropdown = document.createElement('div');
    this.headingDropdown.className = 'heading-dropdown';
    this.headingDropdown.style.display = 'none';

    const headings: HeadingOption[] = [
      { level: 0, label: 'Paragraph' },
      { level: 1, label: 'Heading 1' },
      { level: 2, label: 'Heading 2' },
      { level: 3, label: 'Heading 3' },
      { level: 4, label: 'Heading 4' },
      { level: 5, label: 'Heading 5' },
      { level: 6, label: 'Heading 6' },
    ];

    headings.forEach((h) => {
      const option = document.createElement('button');
      option.className = 'heading-option';
      option.innerHTML = h.level === 0 ? h.label : `<span class="heading-preview h${h.level}">${h.label}</span>`;
      option.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setHeading(h.level);
        this.closeHeadingDropdown();
      });
      this.headingDropdown!.appendChild(option);
    });

    container.appendChild(button);
    container.appendChild(this.headingDropdown);

    this.buttons.set('heading', button);

    return container;
  }

  private toggleHeadingDropdown(): void {
    if (this.isDropdownOpen) {
      this.closeHeadingDropdown();
    } else {
      this.openHeadingDropdown();
    }
  }

  private openHeadingDropdown(): void {
    if (this.headingDropdown) {
      this.headingDropdown.style.display = 'block';
      this.isDropdownOpen = true;
    }
  }

  private closeHeadingDropdown(): void {
    if (this.headingDropdown) {
      this.headingDropdown.style.display = 'none';
      this.isDropdownOpen = false;
    }
  }

  private setupActiveStateListener(): void {
    document.addEventListener('selectionchange', () => {
      this.updateActiveStates();
    });

    document.addEventListener('keyup', () => {
      this.updateActiveStates();
    });

    // Update on click to handle clicking outside selection
    document.addEventListener('mouseup', () => {
      setTimeout(() => this.updateActiveStates(), 10);
    });

    setTimeout(() => this.updateActiveStates(), 100);
  }

  private updateActiveStates(): void {
    try {
      this.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view) return;

        const { state } = view;
        const { selection } = state;
        const { from, to, empty } = selection;
        const $from = selection.$from;

        // === INLINE MARKS (bold, italic, strikethrough, link) ===
        // Requirements:
        // - No selection: check if cursor is inside a mark (for link)
        // - Selection: only highlight if ALL selected text has the mark uniformly

        let hasBold = false;
        let hasItalic = false;
        let hasStrikethrough = false;
        let hasLink = false;

        if (empty) {
          // No selection - only highlight link if cursor is on a link
          const marks = $from.marks();
          hasLink = marks.some(m => m.type.name === 'link');
        } else {
          // Has selection - check if ALL text in selection has the mark
          hasBold = this.isMarkActiveInRange(state, from, to, 'strong');
          hasItalic = this.isMarkActiveInRange(state, from, to, 'emphasis');
          hasStrikethrough = this.isMarkActiveInRange(state, from, to, 'strike_through');
          hasLink = this.isMarkActiveInRange(state, from, to, 'link');
        }

        this.setButtonActive('bold', hasBold);
        this.setButtonActive('italic', hasItalic);
        this.setButtonActive('strikethrough', hasStrikethrough);
        this.setButtonActive('link', hasLink);

        // === BLOCK-LEVEL FORMATTING (heading, blockquote, code block) ===
        // Always show based on cursor position

        const parentNode = $from.parent;
        let depth = $from.depth;
        let isInBlockquote = false;
        let isInCodeBlock = false;

        // Check if cursor is in code block (parent node)
        if (parentNode.type.name === 'code_block') {
          isInCodeBlock = true;
        }

        // Check ancestors for blockquote
        while (depth > 0) {
          const node = $from.node(depth);
          if (node.type.name === 'blockquote') {
            isInBlockquote = true;
          }
          if (node.type.name === 'code_block') {
            isInCodeBlock = true;
          }
          depth--;
        }

        this.setButtonActive('code', isInCodeBlock);

        // Update heading button
        const headingButton = this.buttons.get('heading');
        if (headingButton) {
          if (parentNode.type.name === 'heading') {
            const level = parentNode.attrs.level;
            headingButton.innerHTML = `H${level}<span class="dropdown-arrow">▾</span>`;
            headingButton.classList.add('active');
          } else {
            headingButton.innerHTML = 'P<span class="dropdown-arrow">▾</span>';
            headingButton.classList.remove('active');
          }
        }

        this.setButtonActive('blockquote', isInBlockquote);
      });
    } catch {
      // Editor might not be ready yet
    }
  }

  // Check if ALL text in the range has the specified mark
  private isMarkActiveInRange(state: unknown, from: number, to: number, markName: string): boolean {
    const editorState = state as {
      doc: {
        nodesBetween: (from: number, to: number, callback: (node: { isText: boolean; marks: { type: { name: string } }[] }, pos: number) => void) => void;
      };
      schema: {
        marks: Record<string, unknown>;
      };
    };

    let allTextHasMark = true;
    let hasAnyText = false;

    editorState.doc.nodesBetween(from, to, (node, pos) => {
      if (node.isText) {
        hasAnyText = true;
        // Check the portion of this text node that's in the selection
        const nodeFrom = Math.max(from, pos);
        const nodeTo = Math.min(to, pos + (node as unknown as { nodeSize: number }).nodeSize);

        if (nodeFrom < nodeTo) {
          const hasMark = node.marks.some(m => m.type.name === markName);
          if (!hasMark) {
            allTextHasMark = false;
          }
        }
      }
    });

    return hasAnyText && allTextHasMark;
  }

  private setButtonActive(id: string, active: boolean): void {
    const button = this.buttons.get(id);
    if (button) {
      if (active) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  }

  // History actions
  private undo(): void {
    this.editor.action(callCommand(undoCommand.key));
  }

  private redo(): void {
    this.editor.action(callCommand(redoCommand.key));
  }

  // Formatting actions
  private toggleBold(): void {
    this.editor.action(callCommand(toggleStrongCommand.key));
    setTimeout(() => this.updateActiveStates(), 10);
  }

  private toggleItalic(): void {
    this.editor.action(callCommand(toggleEmphasisCommand.key));
    setTimeout(() => this.updateActiveStates(), 10);
  }

  private toggleStrikethrough(): void {
    this.editor.action(callCommand(toggleStrikethroughCommand.key));
    setTimeout(() => this.updateActiveStates(), 10);
  }

  private toggleCodeBlock(): void {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      if (!view) return;

      const { state, dispatch } = view;
      const { selection } = state;
      const $from = selection.$from;

      // Check if already in code block
      let isInCodeBlock = false;
      if ($from.parent.type.name === 'code_block') {
        isInCodeBlock = true;
      } else {
        let depth = $from.depth;
        while (depth > 0) {
          if ($from.node(depth).type.name === 'code_block') {
            isInCodeBlock = true;
            break;
          }
          depth--;
        }
      }

      if (isInCodeBlock) {
        // Convert code block to paragraph
        const paragraphType = state.schema.nodes.paragraph;
        if (paragraphType) {
          const start = $from.start();
          const end = $from.end();
          const tr = state.tr.setBlockType(start, end, paragraphType);
          dispatch(tr);
        }
      } else {
        // Create code block
        this.editor.action(callCommand(createCodeBlockCommand.key));
      }
    });
    setTimeout(() => this.updateActiveStates(), 10);
  }

  private toggleLink(): void {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      if (!view) return;

      const { state, dispatch } = view;
      const { selection } = state;
      const { from, to, empty } = selection;
      const linkMark = state.schema.marks.link;
      if (!linkMark) return;

      // Check if we're on a link or selection has link
      const hasLink = empty
        ? selection.$from.marks().some(m => m.type.name === 'link')
        : this.isMarkActiveInRange(state, from, to, 'link');

      if (hasLink) {
        // Remove link - show confirmation
        this.showConfirmDialog('Remove link?', () => {
          // Need to get fresh state after confirmation
          this.editor.action((ctx2) => {
            const view2 = ctx2.get(editorViewCtx);
            if (!view2) return;

            const { state: state2, dispatch: dispatch2 } = view2;
            const { selection: selection2 } = state2;
            const { from: from2, to: to2, empty: empty2 } = selection2;
            const linkMark2 = state2.schema.marks.link;
            if (!linkMark2) return;

            if (empty2) {
              // Expand selection to the link and remove it
              const $pos = selection2.$from;
              let linkStart = from2;
              let linkEnd = to2;

              // Find link boundaries
              const parent = $pos.parent;
              let offset = 0;
              for (let i = 0; i < parent.childCount; i++) {
                const child = parent.child(i);
                const childEnd = offset + child.nodeSize;
                if (offset <= $pos.parentOffset && $pos.parentOffset < childEnd) {
                  if (child.marks.some(m => m.type.name === 'link')) {
                    linkStart = $pos.start() + offset;
                    linkEnd = $pos.start() + childEnd;
                  }
                  break;
                }
                offset = childEnd;
              }
              dispatch2(state2.tr.removeMark(linkStart, linkEnd, linkMark2));
            } else {
              dispatch2(state2.tr.removeMark(from2, to2, linkMark2));
            }
            setTimeout(() => this.updateActiveStates(), 10);
          });
        });
        return;
      } else {
        // Add link
        if (empty) {
          this.showLinkDialog(null);
          return;
        }
        this.showLinkDialog((url) => {
          if (url) {
            dispatch(state.tr.addMark(from, to, linkMark.create({ href: url })));
          }
        });
      }
    });
  }

  private showLinkDialog(callback: ((url: string) => void) | null): void {
    // Remove existing dialog if any
    const existingDialog = document.getElementById('link-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    if (callback === null) {
      // No selection, show message
      const dialog = document.createElement('div');
      dialog.id = 'link-dialog';
      dialog.className = 'link-dialog';
      dialog.innerHTML = `
        <div class="link-dialog-content">
          <p>Please select text to create a link</p>
          <div class="link-dialog-buttons">
            <button class="link-dialog-cancel">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);

      const cancelBtn = dialog.querySelector('.link-dialog-cancel') as HTMLButtonElement;
      cancelBtn.onclick = () => dialog.remove();

      setTimeout(() => cancelBtn.focus(), 10);
      return;
    }

    // Create dialog
    const dialog = document.createElement('div');
    dialog.id = 'link-dialog';
    dialog.className = 'link-dialog';
    dialog.innerHTML = `
      <div class="link-dialog-content">
        <label for="link-url-input">Enter URL:</label>
        <input type="text" id="link-url-input" placeholder="https://" />
        <div class="link-dialog-buttons">
          <button class="link-dialog-cancel">Cancel</button>
          <button class="link-dialog-ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    const input = dialog.querySelector('#link-url-input') as HTMLInputElement;
    const okBtn = dialog.querySelector('.link-dialog-ok') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('.link-dialog-cancel') as HTMLButtonElement;

    const submit = () => {
      const url = input.value.trim();
      dialog.remove();
      if (url) {
        callback(url);
        setTimeout(() => this.updateActiveStates(), 10);
      }
    };

    okBtn.onclick = submit;
    cancelBtn.onclick = () => dialog.remove();
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        submit();
      } else if (e.key === 'Escape') {
        dialog.remove();
      }
    };

    // Focus input
    setTimeout(() => input.focus(), 10);
  }

  private showConfirmDialog(message: string, onConfirm: () => void): void {
    // Remove existing dialog if any
    const existingDialog = document.getElementById('confirm-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    const dialog = document.createElement('div');
    dialog.id = 'confirm-dialog';
    dialog.className = 'link-dialog';
    dialog.innerHTML = `
      <div class="link-dialog-content">
        <p>${message}</p>
        <div class="link-dialog-buttons">
          <button class="link-dialog-cancel">Cancel</button>
          <button class="link-dialog-ok">Remove</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    const okBtn = dialog.querySelector('.link-dialog-ok') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('.link-dialog-cancel') as HTMLButtonElement;

    okBtn.onclick = () => {
      dialog.remove();
      onConfirm();
    };

    cancelBtn.onclick = () => {
      dialog.remove();
    };

    // Handle keyboard
    dialog.onkeydown = (e) => {
      if (e.key === 'Enter') {
        dialog.remove();
        onConfirm();
      } else if (e.key === 'Escape') {
        dialog.remove();
      }
    };

    setTimeout(() => okBtn.focus(), 10);
  }

  private toggleBlockquote(): void {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      if (!view) return;

      const { state, dispatch } = view;
      const { selection } = state;
      const $from = selection.$from;

      // Check if already in blockquote and find its depth
      let blockquoteDepth = -1;
      let depth = $from.depth;
      while (depth > 0) {
        const node = $from.node(depth);
        if (node.type.name === 'blockquote') {
          blockquoteDepth = depth;
          break;
        }
        depth--;
      }

      if (blockquoteDepth > 0) {
        // Lift content out of blockquote using ProseMirror's lift
        const range = $from.blockRange();
        if (range) {
          const target = range.depth >= 1 ? range.depth - 1 : 0;
          const tr = state.tr.lift(range, target);
          dispatch(tr);
        }
      } else {
        // Wrap in blockquote
        this.editor.action(callCommand(wrapInBlockquoteCommand.key));
      }
    });
    setTimeout(() => this.updateActiveStates(), 10);
  }

  private setHeading(level: number): void {
    if (level === 0) {
      this.editor.action(callCommand(turnIntoTextCommand.key));
    } else {
      this.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view) return;

        const { state, dispatch } = view;
        const { schema, selection } = state;
        const { $from } = selection;

        const headingType = schema.nodes.heading;
        if (!headingType) return;

        const start = $from.start();
        const parent = $from.parent;
        const end = start + parent.nodeSize - 1;

        dispatch(state.tr.setBlockType(start, end, headingType, { level }));
      });
    }
    setTimeout(() => this.updateActiveStates(), 10);
  }

  public destroy(): void {
    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
    }
  }
}
