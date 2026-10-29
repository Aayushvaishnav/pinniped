import React, {
  ClipboardEventHandler,
  KeyboardEventHandler,
  useMemo,
  ReactNode,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import { Box, Scroll, Text } from 'folds';
import { isKeyHotkey } from 'is-hotkey';
import { Descendant, Editor, NodeEntry, createEditor } from 'slate';
import {
  Slate,
  Editable,
  withReact,
  RenderLeafProps,
  RenderElementProps,
  RenderPlaceholderProps,
} from 'slate-react';
import { withHistory } from 'slate-history';
import { BlockType } from './types';
import { RenderElement, RenderLeaf } from './Elements';
import { CustomElement } from './slate';
import * as css from './Editor.css';
import { toggleKeyboardShortcut } from './keyboard';
import { continueMarkdownList, decorateMarkdown, pasteMarkdownLink } from './markdown';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

const initialValue: CustomElement[] = [
  {
    type: BlockType.Paragraph,
    children: [{ text: '' }],
  },
];

const withInline = (editor: Editor): Editor => {
  const { isInline } = editor;

  editor.isInline = (element) =>
    [BlockType.Mention, BlockType.Emoticon, BlockType.Link, BlockType.Command].includes(
      element.type
    ) || isInline(element);

  return editor;
};

const withVoid = (editor: Editor): Editor => {
  const { isVoid } = editor;

  editor.isVoid = (element) =>
    [BlockType.Mention, BlockType.Emoticon, BlockType.Command].includes(element.type) ||
    isVoid(element);

  return editor;
};

export const useEditor = (): Editor => {
  const [editor] = useState(() => withInline(withVoid(withReact(withHistory(createEditor())))));
  return editor;
};

export type EditorChangeHandler = (value: Descendant[]) => void;
type CustomEditorProps = {
  editableName?: string;
  top?: ReactNode;
  bottom?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  maxHeight?: string;
  editor: Editor;
  placeholder?: string;
  onKeyDown?: KeyboardEventHandler;
  onKeyUp?: KeyboardEventHandler;
  onChange?: EditorChangeHandler;
  onPaste?: ClipboardEventHandler;
};
export const CustomEditor = forwardRef<HTMLDivElement, CustomEditorProps>(
  (
    {
      editableName,
      top,
      bottom,
      before,
      after,
      maxHeight = '50vh',
      editor,
      placeholder,
      onKeyDown,
      onKeyUp,
      onChange,
      onPaste,
    },
    ref
  ) => {
    const [isMarkdown] = useSetting(settingsAtom, 'isMarkdown');
    const [enterForNewline] = useSetting(settingsAtom, 'enterForNewline');

    const renderElement = useCallback(
      (props: RenderElementProps) => <RenderElement {...props} markdown={isMarkdown} />,
      [isMarkdown]
    );

    const renderLeaf = useCallback((props: RenderLeafProps) => <RenderLeaf {...props} />, []);

    const decorate = useMemo(
      () => (isMarkdown ? (entry: NodeEntry) => decorateMarkdown(editor, entry) : undefined),
      [editor, isMarkdown]
    );

    const handleKeydown: KeyboardEventHandler = useCallback(
      (evt) => {
        onKeyDown?.(evt);
        if (
          isMarkdown &&
          !evt.defaultPrevented &&
          (isKeyHotkey('shift+enter', evt) || (enterForNewline && isKeyHotkey('enter', evt))) &&
          continueMarkdownList(editor)
        ) {
          evt.preventDefault();
          return;
        }
        const shortcutToggled = toggleKeyboardShortcut(editor, evt, isMarkdown);
        if (shortcutToggled) evt.preventDefault();
      },
      [editor, onKeyDown, isMarkdown, enterForNewline]
    );

    const handlePaste: ClipboardEventHandler = useCallback(
      (evt) => {
        onPaste?.(evt);
        if (evt.defaultPrevented || !isMarkdown) return;
        if (pasteMarkdownLink(editor, evt.clipboardData.getData('text/plain'))) {
          evt.preventDefault();
        }
      },
      [editor, onPaste, isMarkdown]
    );

    const renderPlaceholder = useCallback(
      ({ attributes, children }: RenderPlaceholderProps) => (
        <span {...attributes} className={css.EditorPlaceholderContainer}>
          {/* Inner component to style the actual text position and appearance */}
          <Text as="span" className={css.EditorPlaceholderTextVisual} truncate>
            {children}
          </Text>
        </span>
      ),
      []
    );

    return (
      <div className={css.Editor} ref={ref}>
        <Slate editor={editor} initialValue={initialValue} onChange={onChange}>
          {top}
          <Box alignItems="Start">
            {before && (
              <Box className={css.EditorOptions} alignItems="Center" gap="100" shrink="No">
                {before}
              </Box>
            )}
            <Scroll
              className={css.EditorTextareaScroll}
              variant="SurfaceVariant"
              style={{ maxHeight }}
              size="300"
              visibility="Hover"
              hideTrack
            >
              <Editable
                data-editable-name={editableName}
                className={css.EditorTextarea}
                placeholder={placeholder}
                renderPlaceholder={renderPlaceholder}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                decorate={decorate}
                onKeyDown={handleKeydown}
                onKeyUp={onKeyUp}
                onPaste={handlePaste}
              />
            </Scroll>
            {after && (
              <Box className={css.EditorOptions} alignItems="Center" gap="100" shrink="No">
                {after}
              </Box>
            )}
          </Box>
          {bottom}
        </Slate>
      </div>
    );
  }
);
