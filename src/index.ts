import {
  workspace,
  languages,
  ExtensionContext,
  CompletionItemProvider,
  CompletionContext,
  ProviderResult
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

// class CalcDocumentHighlightProvider implements DocumentHighlightProvider {
//   constructor(public range: Range) {
//   }
//
//   provideDocumentHighlights(): ProviderResult<ColorInformation[]> {
//     return [{
//       range: this.range,
//       color: Color.create(100, 180, 150, 1),
//     }];
//   }
// }

class CalcProvider implements CompletionItemProvider {
  // highlightDisposable: Disposable;

  constructor(public isDebug: boolean) {}

  public provideCompletionItems(
    document: TextDocument,
    position: Position,
    _token: CancellationToken,
    _context: CompletionContext
  ): ProviderResult<CompletionItem[]> {
    const startPosition = Position.create(position.line, 0);
    const expr = document.getText(Range.create(startPosition, position));
    if (!expr.trimRight().endsWith('=')) {
      return [];
    }
    try {
      const { skip, result } = calculate(expr);
      // this.highlightDisposable = languages.registerDocumentHighlightProvider([{
      //   scheme: document.uri,
      // }], new CalcDocumentHighlightProvider(Range.create(
      //   position.line,
      //   skipPos,
      //   position.line,
      //   position.character
      // )));
      const newText = expr.endsWith(' =') ? ' ' + result : result;
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
      if (this.isDebug) {
        workspace.showMessage(error.message, 'error');
      }
      return [];
    }
  }

  // resolveCompletionItem(item: CompletionItem): CompletionItem {
  //   this.highlightDisposable.dispose();
  //   return item;
  // }
}

export const activate = async (context: ExtensionContext) => {
  const { subscriptions } = context;
  const config = workspace.getConfiguration('calc');

  const disposable = languages.registerCompletionItemProvider(
    'calc',
    'CALC',
    null,
    new CalcProvider(config.get<boolean>('debug', false)),
    ['=', ' '],
    config.get<number>('priority', 99)
  );
  subscriptions.push(disposable);
};
