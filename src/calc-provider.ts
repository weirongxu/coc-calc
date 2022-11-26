import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  Position,
  Range,
  TextDocument,
  TextEdit,
  window,
  workspace,
  WorkspaceConfiguration,
} from 'coc.nvim';
import { calculate } from 'editor-calc';
import { logger } from './util';

export class CalcProvider implements CompletionItemProvider {
  private srcId = 'coc-calc';
  private enableDebug: boolean;

  constructor(public config: WorkspaceConfiguration) {
    this.enableDebug = this.config.get<boolean>('debug', false);
  }

  public async highlight(range: Range) {
    const document = await workspace.document;
    document.buffer.highlightRanges(this.srcId, 'CocCalcFormule', [range]);
  }

  public async clearHighlight() {
    const document = await workspace.document;
    document.buffer.clearNamespace(this.srcId);
  }

  public calculateLine(
    position: Position,
    exprLine: string,
  ): {
    skip: number;
    result: string;
    insertText: string;
    expressionRange: Range;
    expressionWithEqualSignRange: Range;
    expressionEndRange: Range;
  } {
    const { skip, result } = calculate(exprLine);
    const formulaRaw = exprLine.slice(skip);
    const leftMatches = formulaRaw.match(/^\s+/);
    const leftEmpty = leftMatches ? leftMatches[0].length : 0;
    const rightMatches = formulaRaw.match(/[\s=]+$/);
    const rightEmpty = rightMatches ? rightMatches[0].length : 0;

    const insertText = exprLine.endsWith(' =') ? ` ${result}` : result;

    return {
      skip,
      result,
      insertText,
      expressionRange: Range.create(
        position.line,
        skip + leftEmpty,
        position.line,
        position.character - rightEmpty,
      ),
      expressionWithEqualSignRange: Range.create(
        position.line,
        skip + leftEmpty,
        position.line,
        position.character,
      ),
      expressionEndRange: Range.create(
        position.line,
        position.character,
        position.line,
        position.character,
      ),
    };
  }

  public async provideCompletionItems(
    document: TextDocument,
    position: Position,
  ): Promise<CompletionItem[]> {
    const exprLine = document.getText(
      Range.create(Position.create(position.line, 0), position),
    );
    if (!exprLine.trimEnd().endsWith('=')) {
      return [];
    }
    try {
      const {
        skip,
        expressionRange,
        expressionWithEqualSignRange,
        expressionEndRange,
        insertText,
        result,
      } = this.calculateLine(position, exprLine);

      this.clearHighlight().catch(logger.error);

      this.highlight(expressionRange).catch(logger.error);

      const items: CompletionItem[] = [
        {
          label: result,
          kind: CompletionItemKind.Constant,
          documentation: `append \`${exprLine.slice(skip)}${insertText}\``,
          textEdit: TextEdit.replace(expressionEndRange, insertText),
        } as CompletionItem,
        {
          label: result,
          kind: CompletionItemKind.Constant,
          documentation: `replace \`${exprLine.slice(skip)}\` -> \`${result}\``,
          textEdit: TextEdit.replace(expressionWithEqualSignRange, result),
        } as CompletionItem,
      ];
      return items;
    } catch (error) {
      if (this.enableDebug && error instanceof Error) {
        await window.showErrorMessage(error.message, 'error');
      }
      return [];
    }
  }
}
