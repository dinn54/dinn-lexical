"use client";

import { $isCodeNode, $createCodeNode } from "@lexical/code";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

import { INSERT_IMAGE_COMMAND } from "../nodes/ImageNode";
import { INSERT_TWEET_COMMAND } from "../nodes/TweetNode";
import { INSERT_YOUTUBE_COMMAND } from "../nodes/YouTubeNode";
import { UPLOAD_IMAGE_FILES_COMMAND } from "../imageUpload";

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "quote" | "ul" | "ol" | "code";
type InsertType = "image" | "youtube" | "tweet" | "table" | null;

type ToolbarPluginProps = {
  canUploadImages?: boolean;
};

const blockTypeLabels: Record<BlockType, string> = {
  paragraph: "본문",
  h1: "제목 1",
  h2: "제목 2",
  h3: "제목 3",
  quote: "인용구",
  ul: "글머리 목록",
  ol: "번호 목록",
  code: "코드",
};

function extractYouTubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractTweetId(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  if (match) return match[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return null;
}

function normalizeLinkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function ToolbarPlugin({ canUploadImages = false }: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("paragraph");
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [insertType, setInsertType] = useState<InsertType>(null);
  const [insertValue, setInsertValue] = useState("");
  const [imageAltText, setImageAltText] = useState("");
  const [tableRows, setTableRows] = useState("3");
  const [tableColumns, setTableColumns] = useState("3");
  const [tableHeaders, setTableHeaders] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    if ($isListNode(element)) {
      setBlockType(element.getTag() === "ol" ? "ol" : "ul");
    } else if ($isHeadingNode(element)) {
      const tag = element.getTag();
      setBlockType(tag === "h1" || tag === "h2" || tag === "h3" ? tag : "paragraph");
    } else if ($isCodeNode(element)) {
      setBlockType("code");
    } else if (element.getType() === "quote") {
      setBlockType("quote");
    } else {
      setBlockType("paragraph");
    }

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));
    setIsUnderline(selection.hasFormat("underline"));
    setIsStrikethrough(selection.hasFormat("strikethrough"));
    setIsCode(selection.hasFormat("code"));

    const node = selection.anchor.getNode();
    const parent = node.getParent();
    setIsLink($isLinkNode(parent) || $isLinkNode(node));
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(updateToolbar);
    });
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(CAN_UNDO_COMMAND, (payload) => {
      setCanUndo(payload);
      return false;
    }, COMMAND_PRIORITY_LOW);
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(CAN_REDO_COMMAND, (payload) => {
      setCanRedo(payload);
      return false;
    }, COMMAND_PRIORITY_LOW);
  }, [editor]);

  const formatBlock = (nextBlockType: BlockType) => {
    if (nextBlockType === "ul") {
      editor.dispatchCommand(
        blockType === "ul" ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
        undefined,
      );
      return;
    }

    if (nextBlockType === "ol") {
      editor.dispatchCommand(
        blockType === "ol" ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
        undefined,
      );
      return;
    }

    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (nextBlockType === "paragraph") {
        $setBlocksType(selection, () => $createParagraphNode());
      } else if (nextBlockType === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
      } else if (nextBlockType === "code") {
        $setBlocksType(selection, () => $createCodeNode());
      } else {
        $setBlocksType(selection, () => $createHeadingNode(nextBlockType));
      }
    });
  };

  const openLinkDialog = () => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        setLinkUrl("https://");
        setLinkDialogOpen(true);
        return;
      }
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      if ($isLinkNode(node)) {
        setLinkUrl(node.getURL() || "https://");
      } else if ($isLinkNode(parent)) {
        setLinkUrl(parent.getURL() || "https://");
      } else {
        setLinkUrl("https://");
      }
      setLinkDialogOpen(true);
    });
  };

  const applyLink = () => {
    const normalized = normalizeLinkUrl(linkUrl);
    if (!normalized) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
      url: normalized,
      target: "_blank",
      rel: "noopener noreferrer",
    });
    setLinkDialogOpen(false);
  };

  const openInsertDialog = (type: InsertType) => {
    setInsertType(type);
    setInsertValue("");
    setImageAltText("");
    setTableRows("3");
    setTableColumns("3");
    setTableHeaders(true);
  };

  const closeInsertDialog = () => setInsertType(null);

  const submitInsert = () => {
    if (insertType === "image") {
      if (insertValue.trim()) {
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
          src: insertValue.trim(),
          altText: imageAltText,
          width: 720,
        });
      }
    } else if (insertType === "youtube") {
      const videoId = extractYouTubeVideoId(insertValue);
      if (videoId) editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, videoId);
    } else if (insertType === "tweet") {
      const tweetId = extractTweetId(insertValue);
      if (tweetId) editor.dispatchCommand(INSERT_TWEET_COMMAND, tweetId);
    } else if (insertType === "table") {
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        rows: tableRows,
        columns: tableColumns,
        includeHeaders: tableHeaders,
      });
    }
    closeInsertDialog();
  };

  const onImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    editor.dispatchCommand(UPLOAD_IMAGE_FILES_COMMAND, {
      files,
      source: "file-dialog",
    });
    closeInsertDialog();
  };

  return (
    <div className="dinn-lexical-toolbar" data-editor-toolbar>
      <button type="button" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} disabled={!canUndo}>↶</button>
      <button type="button" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} disabled={!canRedo}>↷</button>
      <span className="dinn-lexical-toolbar-separator" />
      <select
        value={blockType}
        aria-label="블록 형식"
        onChange={(event) => formatBlock(event.target.value as BlockType)}
      >
        {(Object.keys(blockTypeLabels) as BlockType[]).map((type) => (
          <option key={type} value={type}>{blockTypeLabels[type]}</option>
        ))}
      </select>
      <span className="dinn-lexical-toolbar-separator" />
      <button type="button" className={isBold ? "is-active" : ""} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>B</button>
      <button type="button" className={isItalic ? "is-active" : ""} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}><em>I</em></button>
      <button type="button" className={isUnderline ? "is-active" : ""} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}><u>U</u></button>
      <button type="button" className={isStrikethrough ? "is-active" : ""} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}><s>S</s></button>
      <button type="button" className={isCode ? "is-active" : ""} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}>{"{}"}</button>
      <button type="button" className={isLink ? "is-active" : ""} onClick={() => isLink ? editor.dispatchCommand(TOGGLE_LINK_COMMAND, null) : openLinkDialog()}>Link</button>
      <span className="dinn-lexical-toolbar-separator" />
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")}>좌</button>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")}>중</button>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")}>우</button>
      <span className="dinn-lexical-toolbar-separator" />
      <button type="button" onClick={() => openInsertDialog("image")}>이미지</button>
      <button type="button" onClick={() => openInsertDialog("youtube")}>YouTube</button>
      <button type="button" onClick={() => openInsertDialog("tweet")}>Tweet</button>
      <button type="button" onClick={() => openInsertDialog("table")}>표</button>
      {canUploadImages && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onImageFileChange}
          className="dinn-lexical-visually-hidden"
        />
      )}

      {linkDialogOpen && (
        <div className="dinn-lexical-dialog-backdrop" role="presentation">
          <form
            className="dinn-lexical-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              applyLink();
            }}
          >
            <h2>링크 삽입</h2>
            <label>
              URL
              <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} />
            </label>
            <div className="dinn-lexical-dialog-actions">
              <button type="button" onClick={() => setLinkDialogOpen(false)}>취소</button>
              <button type="submit">적용</button>
            </div>
          </form>
        </div>
      )}

      {insertType && (
        <div className="dinn-lexical-dialog-backdrop" role="presentation">
          <form
            className="dinn-lexical-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              submitInsert();
            }}
          >
            <h2>삽입</h2>
            {insertType === "image" && (
              <>
                {canUploadImages && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}>
                    파일 선택
                  </button>
                )}
                <label>
                  이미지 URL
                  <input value={insertValue} onChange={(event) => setInsertValue(event.target.value)} />
                </label>
                <label>
                  대체 텍스트
                  <input value={imageAltText} onChange={(event) => setImageAltText(event.target.value)} />
                </label>
              </>
            )}
            {insertType === "youtube" && (
              <label>
                YouTube URL 또는 ID
                <input value={insertValue} onChange={(event) => setInsertValue(event.target.value)} />
              </label>
            )}
            {insertType === "tweet" && (
              <label>
                Tweet URL 또는 ID
                <input value={insertValue} onChange={(event) => setInsertValue(event.target.value)} />
              </label>
            )}
            {insertType === "table" && (
              <>
                <label>
                  행 수
                  <input type="number" min="1" max="20" value={tableRows} onChange={(event) => setTableRows(event.target.value)} />
                </label>
                <label>
                  열 수
                  <input type="number" min="1" max="10" value={tableColumns} onChange={(event) => setTableColumns(event.target.value)} />
                </label>
                <label className="dinn-lexical-checkbox-label">
                  <input type="checkbox" checked={tableHeaders} onChange={(event) => setTableHeaders(event.target.checked)} />
                  헤더 행 포함
                </label>
              </>
            )}
            <div className="dinn-lexical-dialog-actions">
              <button type="button" onClick={closeInsertDialog}>취소</button>
              <button type="submit">삽입</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
