import { workspace, languages, ExtensionContext, commands } from 'coc.nvim';
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
    // workspace.registerAutocmd({
    //   event: ['InsertLeave'],
    //   callback: () => {
    //     calcProvider.enableActive = false;
    //   }
    // }),
    // workspace.registerKeymap(['n'], 'calc-active-mode-i', async () => {
    //   await nvim.feedKeys('i', 'n', false);
    //   calcProvider.enableActive = true;
    // }),
  );

  async function replaceResult(mode: 'append' | 'replace') {
    const doc = await workspace.document;
    const position = await workspace.getCursorPosition();
    const line = doc.getline(position.line);
    const equalPosition = line.indexOf('=', position.character - 1);
    const character = equalPosition === -1 ? line.length : equalPosition + 1;
    const exprLine = line.slice(0, character);
    const {
      newText,
      expressionWithEqualSignRange,
      expressionEndRange,
    } = calcProvider.calculateLine(
      Position.create(position.line, character),
      exprLine,
    );
    if (mode === 'append') {
      const endWithEqual = exprLine.trimRight().endsWith('=');
      doc
        .applyEdits(nvim, [
          TextEdit.replace(
            expressionEndRange,
            endWithEqual ? newText : ' = ' + newText,
          ),
        ])
        .catch(onError);
    } else if (mode === 'replace') {
      doc
        .applyEdits(nvim, [
          TextEdit.replace(expressionWithEqualSignRange, newText),
        ])
        .catch(onError);
    }
  }

  subscriptions.push(
    workspace.registerKeymap(['n', 'i'], 'calc-result-append', async () => {
      await replaceResult('append');
    }),
    workspace.registerKeymap(['n', 'i'], 'calc-result-replace', async () => {
      await replaceResult('replace');
    }),
  );
};
