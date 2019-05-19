'use strict'

import { commands, ExtensionContext, Range, window, Selection, Position } from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('markdown.extension.toggleInlineMath', toggleInlineMath),
        commands.registerCommand('markdown.extension.toggleDisplayedMath', toggleDisplayedMath),
    );
}

function toggleInlineMath() {
    let editor = window.activeTextEditor;
    let cursorPosBeforeInsertion = editor.selection.active;
    
    let [isInInline, inlineRange] = isInInlineMath();
    if (isInInline) {
        // Cancel the block
        editor.edit(editBuilder => {
            editBuilder.delete(inlineRange);
        });
    } else {
        // Create the block
        editor.edit(editBuilder => {
            editBuilder.insert(cursorPosBeforeInsertion, ' $$ ');
        }).then(() => {
            let cursorPosAfterInsertion = editor.selection.active;
            let mathPosition = cursorPosAfterInsertion.with(cursorPosAfterInsertion.line, cursorPosAfterInsertion.character - 2)
            editor.selection = new Selection(mathPosition, mathPosition);
        });
    }

    /**
     * Function name: isInInlineMath
     * Purpose: return true and the range when the cursor is in an inline math block.
     * Assume that user is not using selection, i.e. 
     * editor.selection.start == editor.selection.end
     * 
     * Time complexity: O(1)~O(n) where n is the length of current line.
     * 
     * Algorithm Pseudocode:
     *  1. Initialize leftPos,cursor,rightPos
     *  2. Found if there is a left `$` and a right `$`, if both, return true.
     */
    function isInInlineMath(): [boolean, Range] {
        let line = editor.document.lineAt(cursorPosBeforeInsertion).text;
        let leftPos = cursorPosBeforeInsertion.character - 1;
        let rightPos = cursorPosBeforeInsertion.character;
        let leftDollarFound = false;
        let rightDollarFound = false;
        while(leftPos >= 0 && rightPos < line.length) {
            if(!leftDollarFound) {
                if (line[leftPos--] === '$') {
                    leftDollarFound = true;
                }
            }
            if(!rightDollarFound) {
                if (line[rightPos++] === '$') {
                    rightDollarFound = true;
                }
            }
            if (leftDollarFound && rightDollarFound) {
                leftPos++;
                rightPos--;
                break;
            }
        }
        if (leftDollarFound && rightDollarFound) {
            // Note $ ... $ (with trailing whitespace) is not an inline math block
            if (line[leftPos+1] !== ' ' && rightPos[rightPos-1] !== ' ') {
                let leftDollarPosition = new Position(cursorPosBeforeInsertion.line, leftPos);
                let rightDollarPosition = new Position(cursorPosBeforeInsertion.line, rightPos+1);
                return [true, new Range(leftDollarPosition, rightDollarPosition)];
            }
        }
        return [false, null];
    }
}

function toggleDisplayedMath() {
    let editor = window.activeTextEditor;
    let cursorPosBeforeInsertion = editor.selection.active;

    let [isInDisplayed, displayedRange] = isInDisplayedMath();
    if (isInDisplayed) {
        // Cancel the block
        editor.edit(editBuilder => {
            editBuilder.delete(displayedRange);
        });
    }
    else {
        // Create the block
        editor.edit(editBuilder => {
            editBuilder.insert(cursorPosBeforeInsertion, `\n$$\n\n$$\n`);
        }).then(() => {
            let cursorPosAfterInsertion = editor.selection.active;
            let mathPosition = cursorPosAfterInsertion.with(cursorPosAfterInsertion.line - 2, 0)
            editor.selection = new Selection(mathPosition, mathPosition);
        });
    }

    /**
     * Function name: isInDisplayedMath
     * Purpose: return true and the range when the cursor is in a displayed math block.
     * Assume that user is not using selection, i.e. 
     * editor.selection.start == editor.selection.end
     * 
     * Time complexity: O(1)~O(n) where n is the number of lines of the file.
     * 
     * Algorithm Pseudocode:
     *  1. Initialize upPos,cursor,downPos
     *  2. Found if there is a up `$$` and a down `$$`, if both, return true.
     */
    function isInDisplayedMath(): [boolean, Range] {
        let upPos = cursorPosBeforeInsertion.line - 1;
        let downPos = cursorPosBeforeInsertion.line + 1;
        let upDollarFound = false;
        let downDollarFound = false;
        while(upPos >= 0 && downPos < editor.document.lineCount) {
            if(!upDollarFound) {
                if (editor.document.lineAt(upPos).text == '$$') {
                    upDollarFound = true;
                } else {
                    upPos--;
                }
            }
            if(!downDollarFound) {
                if (editor.document.lineAt(downPos).text == '$$') {
                    downDollarFound = true;
                } else {
                    downPos++;
                }
            }
            if (upDollarFound && downDollarFound) {
                break;
            }
        }
        if (upDollarFound && downDollarFound) {
            let upDollarPosition = new Position(upPos, 0);
            let downDollarPosition = new Position(downPos, 2);
            return [true, new Range(upDollarPosition, downDollarPosition)];
        }
        return [false, null];
    }
}
