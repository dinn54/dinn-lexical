import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import {
  $applyNodeReplacement,
  createCommand,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalCommand,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import * as React from "react";

import { cn } from "../../core/cx";
import theme from "../../core/theme";

function HorizontalRuleComponent({ nodeKey }: { nodeKey: NodeKey }) {
  const [_editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);

  return (
    <div className={cn(theme.hrBlock, isSelected && theme.hrSelected)}>
      <div
        className={theme.hrInner}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (event.shiftKey) {
            setSelected(!isSelected);
            return;
          }

          clearSelection();
          setSelected(true);
        }}
      >
        <hr className={theme.hr} />
      </div>
    </div>
  );
}

export type SerializedHorizontalRuleNode = SerializedLexicalNode;

export const INSERT_HORIZONTAL_RULE_COMMAND: LexicalCommand<void> = createCommand(
  "INSERT_HORIZONTAL_RULE_COMMAND"
);

export class HorizontalRuleNode extends DecoratorNode<React.ReactElement> {
  static getType(): string {
    return "horizontalrule";
  }

  static clone(node: HorizontalRuleNode): HorizontalRuleNode {
    return new HorizontalRuleNode(node.__key);
  }

  static importJSON(
    _serializedNode: SerializedHorizontalRuleNode
  ): HorizontalRuleNode {
    return $createHorizontalRuleNode();
  }

  static importDOM(): DOMConversionMap | null {
    return {
      hr: () => ({
        conversion: convertHorizontalRuleElement,
        priority: 0,
      }),
    };
  }

  exportJSON(): SerializedHorizontalRuleNode {
    return {
      type: "horizontalrule",
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    return { element: document.createElement("hr") };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement("div");
    element.className = theme.decoratorContents;
    return element;
  }

  getTextContent(): string {
    return "\n";
  }

  isInline(): boolean {
    return false;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): React.ReactElement {
    return <HorizontalRuleComponent nodeKey={this.getKey()} />;
  }
}

function convertHorizontalRuleElement(_domNode: HTMLElement): DOMConversionOutput {
  return { node: $createHorizontalRuleNode() };
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return $applyNodeReplacement(new HorizontalRuleNode());
}

export function $isHorizontalRuleNode(
  node: LexicalNode | null | undefined
): node is HorizontalRuleNode {
  return node instanceof HorizontalRuleNode;
}
