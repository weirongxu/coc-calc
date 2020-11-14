import {
  workspace,
  CompletionItemProvider,
  CompletionContext,
  WorkspaceConfiguration,
} from 'coc.nvim';
import { calculate } from 'editor-calc';
import {
  CompletionItem,
  CompletionItemKind,
  Range,
  Position,
  CancellationToken,
  TextEdit,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';

export class CalcProvider implements CompletionItemProvider {
  private highlightKey = 'coc-calc';
  private replacePosition?: Range;
  private enableDebug: boolean;
  private enableReplaceOriginalExpression: boolean;

  constructor(
    public config: WorkspaceConfiguration,
    private onError: (error: Error) => any,
  ) {
    this.enableDebug = this.config.get<boolean>('debug', false);
    this.enableReplaceOriginalExpression = this.config.get<boolean>(
      'replaceOriginalExpression',
      true,
    );
  }

  public async highlight(range: Range) {
    const document = await workspace.document;
    document.highlightRanges(
      [range],
      'CocCalcFormule',
      // @ts-ignore
      this.highlightKey,
    );
  }

  public async clearHighlight() {
    const document = await workspace.document;
    // @ts-ignore
    document.clearNamespace(this.highlightKey);
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

    const insertText = exprLine.endsWith(' =') ? ' ' + result : result;

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
    _token: CancellationToken,
    _context: CompletionContext,
  ): Promise<CompletionItem[]> {
    const exprLine = document.getText(
      Range.create(Position.create(position.line, 0), position),
    );
    if (!exprLine.trimRight().endsWith('=')) {
      return [];
    }
    try {
      const {
        skip,
        expressionRange,
        expressionWithEqualSignRange,
        expressionEndRange,
        insertText,
      } = this.calculateLine(position, exprLine);

      this.clearHighlight().catch(this.onError);

      this.highlight(expressionRange).catch(this.onError);

      this.replacePosition = expressionWithEqualSignRange;

      return [
        {
          label: insertText,
          kind: CompletionItemKind.Constant,
          documentation:
            '`' + exprLine.slice(skip).trimLeft() + insertText + '`',
          textEdit: TextEdit.replace(expressionEndRange, insertText),
        } as CompletionItem,
      ];
    } catch (error) {
      if (this.enableDebug) {
        // eslint-disable-next-line no-restricted-properties
        workspace.showMessage(error.message, 'error');
      }
      return [];
    }
  }

  async resolveCompletionItem(
    item: CompletionItem,
    _token: CancellationToken,
  ): Promise<CompletionItem> {
    if (this.enableReplaceOriginalExpression) {
      item.textEdit = {
        range: this.replacePosition!,
        newText: item.textEdit!.newText.trim(),
      };
    }
    return item;
  }
}
