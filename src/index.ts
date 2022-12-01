import {
  commands,
  Document,
  ExtensionContext,
  languages,
  Position,
  TextEdit,
  window,
  workspace,
} from 'coc.nvim'
import { calculate } from 'editor-calc'
import { CalcProvider } from './calc-provider'
import { logger } from './util'

export const activate = async (context: ExtensionContext) => {
  const { subscriptions } = context
  const config = workspace.getConfiguration('calc')
  const { nvim } = workspace

  if (config.get<boolean>('highlight', true)) {
    nvim.command('highlight default link CocCalcFormule CocHighlightText', true)
  }

  const calcProvider = new CalcProvider(config)

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
        calcProvider.clearHighlight().catch(logger.error)
      },
    }),
    commands.registerCommand('calc.calculate', (expression: string) => {
      try {
        return calculate(expression).result
      } catch (err) {
        return null
      }
    }),
    // workspace.registerKeymap(['n'], 'calc-active-mode-i', async () => {
    //   await nvim.feedKeys('i', 'n', false);
    //   // TODO enableActive
    // }),
  )

  async function replaceResultWithPosition(
    doc: Document,
    position: Position,
    expression: string,
    mode: 'append' | 'replace',
  ) {
    const { insertText, expressionWithEqualSignRange, expressionEndRange } =
      calcProvider.calculateLine(position, expression)
    if (mode === 'append') {
      const endWithEqual = expression.trimEnd().endsWith('=')
      await doc.applyEdits([
        TextEdit.replace(
          expressionEndRange,
          endWithEqual ? insertText : ` = ${insertText}`,
        ),
      ])
    } else if (mode === 'replace') {
      await doc.applyEdits([
        TextEdit.replace(expressionWithEqualSignRange, insertText),
      ])
    }
  }

  async function replaceResult(
    mode: 'append' | 'replace',
    withCursor: boolean,
  ) {
    const doc = await workspace.document
    const cursor = await window.getCursorPosition()
    const line = doc.getline(cursor.line)
    const [position, expression] = ((): [Position, string] => {
      if (withCursor) {
        return [cursor, line.slice(0, cursor.character)]
      } else {
        return [Position.create(cursor.line, line.length), line]
      }
    })()
    await replaceResultWithPosition(doc, position, expression, mode)
  }

  subscriptions.push(
    commands.registerCommand(
      'calc.appendWithCursor',
      logger.asyncCatch(async () => {
        await replaceResult('append', true)
      }),
    ),
    commands.registerCommand(
      'calc.append',
      logger.asyncCatch(async () => {
        await replaceResult('append', false)
      }),
    ),
    commands.registerCommand(
      'calc.replaceWithCursor',
      logger.asyncCatch(async () => {
        await replaceResult('replace', true)
      }),
    ),
    commands.registerCommand(
      'calc.replace',
      logger.asyncCatch(async () => {
        await replaceResult('replace', false)
      }),
    ),
    workspace.registerKeymap(['n', 'i'], 'calc-result-append', async () => {
      await commands.executeCommand('calc.append')
    }),
    workspace.registerKeymap(['n', 'i'], 'calc-result-replace', async () => {
      await commands.executeCommand('calc.replace')
    }),
  )
}
