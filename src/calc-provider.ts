import {
  workspace,
  CompletionItemProvider,
  CompletionContext,
  WorkspaceConfiguration,
} from 'coc.nvim';
import { calculate } from './calc-parser';
import {
  TextDocument,
  CompletionItem,
  CompletionItemKind,
  Range,
  Position,
  CancellationToken,
} from 'vscode-languageserver-protocol';

export class CalcProvider implements CompletionItemProvider {
  public enableActive: boolean;

  private srcId: number;
  private matchIds: Set<number> = new Set();
  private replacePosition?: Range;
  private enableDebug: boolean;
  private enableReplaceOriginalExpression: boolean;

  constructor(public config: WorkspaceConfiguration, private onError: (error: Error) => any) {
    this.srcId = workspace.createNameSpace('coc-calc');
    this.enableActive = false;
    this.enableDebug = this.config.get<boolean>('debug', false);
    this.enableReplaceOriginalExpression = this.config.get<boolean>(
      'replaceOriginalExpression',
      true,
    );
  }

  public async highlight(range: Range) {
    const document = await workspace.document;
    const matchIds = document.highlightRanges(
      [range],
      'CocCalcFormule',
      this.srcId,
    );
    matchIds.forEach((id) => this.matchIds.add(id));
  }

  public async clearHighlight() {
    const document = await workspace.document;
    document.clearMatchIds(this.matchIds);
  }

  public calculateLine(
    position: Position,
    exprLine: string,
  ): {
    skip: number;
    result: string;
    newText: string;
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

    const newText = exprLine.endsWith(' =') ? ' ' + result : result;

    return {
      skip,
      result,
      newText,
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
    if (!this.enableActive && !exprLine.trimRight().endsWith('=')) {
      return [];
    }
    try {
      const {
        skip,
        result,
        expressionRange,
        expressionWithEqualSignRange,
        expressionEndRange,
        newText,
      } = this.calculateLine(position, exprLine);

      this.clearHighlight().catch(this.onError);

      this.highlight(expressionRange).catch(this.onError);

      this.replacePosition = expressionWithEqualSignRange;

      return [
        {
          label: result,
          kind: CompletionItemKind.Constant,
          documentation: '`' + exprLine.slice(skip).trimLeft() + newText + '`',
          textEdit: {
            range: expressionEndRange,
            newText,
          },
        } as CompletionItem,
      ];
    } catch (error) {
      if (this.enableDebug) {
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
