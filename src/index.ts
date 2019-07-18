import {
  workspace,
  languages,
  ExtensionContext,
  CompletionItemProvider,
  CompletionContext,
  WorkspaceConfiguration
} from 'coc.nvim';
import {
  TextDocument,
  CompletionItem,
  CompletionItemKind,
  Range,
  Position,
  CancellationToken
} from 'vscode-languageserver-protocol';
import { calculate } from './calc-parser';

class CalcProvider implements CompletionItemProvider {
  private srdId: number;
  private matchIds: Set<number> = new Set();
  private replacePosition?: Range;
  private enableDebug: boolean;
  private enableReplaceOriginalExpression: boolean;

  constructor(public config: WorkspaceConfiguration) {
    this.srdId = workspace.createNameSpace('coc-calc');
    this.enableDebug = this.config.get<boolean>('debug', false);
    this.enableReplaceOriginalExpression = this.config.get<boolean>('replaceOriginalExpression', true);

    workspace.registerAutocmd({
      event: ['CursorMoved', 'CursorMovedI', 'InsertLeave'],
      callback: () => {
        this.clearHighlight();
      }
    });
  }

  public async highlight(range: Range) {
    workspace.showMessage(range.toString(), 'error');
    const document = await workspace.document;
    const matchIds = document.highlightRanges(
      [range],
      'CocCalcFormule',
      this.srdId
    );
    matchIds.forEach(id => this.matchIds.add(id));
  }

  public async clearHighlight() {
    const document = await workspace.document;
    document.clearMatchIds(this.matchIds);
  }

  public async provideCompletionItems(
    document: TextDocument,
    position: Position,
    _token: CancellationToken,
    _context: CompletionContext
  ): Promise<CompletionItem[]> {
    const startPosition = Position.create(position.line, 0);
    const expr = document.getText(Range.create(startPosition, position));
    if (!expr.trimRight().endsWith('=')) {
      return [];
    }
    try {
      const { skip, result } = calculate(expr);
      const formulaRaw = expr.slice(skip);
      const leftMatches = formulaRaw.match(/^\s+/);
      const leftEmpty = leftMatches ? leftMatches[0].length : 0;
      const rightMatches = formulaRaw.match(/[\s=]+$/);
      const rightEmpty = rightMatches ? rightMatches[0].length : 0;

      const newText = expr.endsWith(' =') ? ' ' + result : result;

      this.clearHighlight();

      this.highlight(
        Range.create(
          position.line,
          skip + leftEmpty,
          position.line,
          position.character - rightEmpty
        )
      );

      this.replacePosition = Range.create(
        position.line,
        skip + leftEmpty,
        position.line,
        position.character + newText.length
      );

      return [
        {
          label: result,
          kind: CompletionItemKind.Constant,
          documentation: '`' + expr.slice(skip).trimLeft() + newText + '`',
          textEdit: {
            range: Range.create(
              position.line,
              position.character,
              position.line,
              position.character
            ),
            newText
          }
        } as CompletionItem
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
    _token: CancellationToken
  ): Promise<CompletionItem> {
    if (this.enableReplaceOriginalExpression) {
      item.textEdit = {
        range: this.replacePosition!,
        newText: item.textEdit!.newText.trim()
      };
    }
    return item;
  }
}

export const activate = async (context: ExtensionContext) => {
  const { subscriptions } = context;
  const config = workspace.getConfiguration('calc');

  if (config.get<boolean>('highlight', true)) {
    workspace.nvim.command(
      'highlight default link CocCalcFormule CocHighlightText',
      true
    );
  }

  const disposable = languages.registerCompletionItemProvider(
    'calc',
    'CALC',
    null,
    new CalcProvider(config),
    ['=', ' '],
    config.get<number>('priority', 1000)
  );
  subscriptions.push(disposable);
};
