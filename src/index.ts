import {
  workspace,
  languages,
  ExtensionContext,
  commands,
  Document,
} from 'coc.nvim';
import { Position, TextEdit } from 'vscode-languageserver-protocol';
import { CalcProvider } from './calc-provider';
import { calculate } from 'editor-calc';

export const activate = async (context: ExtensionContext) => {
  const { subscriptions, logger } = context;
  const config = workspace.getConfiguration('calc');
  const { nvim } = workspace;

  if (config.get<boolean>('highlight', true)) {
    nvim.command(
      'highlight default link CocCalcFormule CocHighlightText',
      true,
    );
  }

  const onError = logger.error.bind(logger);

  const calcProvider = new CalcProvider(config, onError);

  subscriptions.push(
    languages.registerCompletionItemProvider(
      'calc',
      'CALC',
      null,
      calcProvider,
      ['=', ' '],
      config.get<number>('priority', 1000),
    ),
    workspace.registerAutocmd({
      event: ['CursorMoved', 'CursorMovedI', 'InsertLeave'],
      callback: () => {
        calcProvider.clearHighlight().catch(onError);
      },
    }),
    commands.registerCommand('calc.calculate', (expression: string) => {
      try {
        return calculate(expression).result;
      } catch (err) {
        return null;
      }
    }),
    // workspace.registerKeymap(['n'], 'calc-active-mode-i', async () => {
    //   await nvim.feedKeys('i', 'n', false);
    //   // TODO enableActive
    // }),
  );

  async function replaceResultWithPosition(
    doc: Document,
    position: Position,
    expression: string,
    mode: 'append' | 'replace',
  ) {
    const {
      insertText,
      expressionWithEqualSignRange,
      expressionEndRange,
    } = calcProvider.calculateLine(position, expression);
    if (mode === 'append') {
      const endWithEqual = expression.trimRight().endsWith('=');
      await doc.applyEdits([
        TextEdit.replace(
          expressionEndRange,
          endWithEqual ? insertText : ' = ' + insertText,
        ),
      ]);
    } else if (mode === 'replace') {
      await doc.applyEdits([
        TextEdit.replace(expressionWithEqualSignRange, insertText),
      ]);
    }
  }

  async function replaceResult(
    mode: 'append' | 'replace',
    withCursor: boolean,
  ) {
    const doc = await workspace.document;
    const cursor = await workspace.getCursorPosition();
    const line = doc.getline(cursor.line);
    const [position, expression] = ((): [Position, string] => {
      if (withCursor) {
        return [cursor, line.slice(0, cursor.character)];
      } else {
        return [Position.create(cursor.line, line.length), line];
      }
    })();
    await replaceResultWithPosition(doc, position, expression, mode);
  }

  subscriptions.push(
    commands.registerCommand('calc.appendWithCursor', async () => {
      await replaceResult('append', true);
    }),
    commands.registerCommand('calc.append', async () => {
      await replaceResult('append', false);
    }),
    commands.registerCommand('calc.replaceWithCursor', async () => {
      await replaceResult('replace', true);
    }),
    commands.registerCommand('calc.replace', async () => {
      await replaceResult('replace', false);
    }),
    workspace.registerKeymap(['n', 'i'], 'calc-result-append', async () => {
      await commands.executeCommand('calc.append');
    }),
    workspace.registerKeymap(['n', 'i'], 'calc-result-replace', async () => {
      await commands.executeCommand('calc.replace');
    }),
  );
};
