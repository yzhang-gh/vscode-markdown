'use strict' 

import { commands, window, workspace, ExtensionContext, Position, Range, Selection, TextDocument } from 'vscode'; 
import * as vscode from 'vscode'; 

//Vietnamese characters regex
export const vnRegex = /[\u00C0-\u00C3\u00C8-\u00CA\u00CC\u00CD\u00D2-\u00D5\u00D9\u00DA\u00DD\u00E0-\u00E3\u00E8-\u00EA\u00EC\u00ED\u00F2-\u00F5\u00F9\u00FA\u00FD\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9]/ 

let countDown = 0; //Repeated calls countdown.
let deleteCounter = 0; //For countup testing.

//Edit - Delete Position with `await`
export async function deletePosition(lineNumber, startPosition, endPosition) {
    let range = new Range(lineNumber, startPosition, lineNumber, endPosition);
    return deleteRange(window.activeTextEditor, range);
}

//Edit - Delete Range with `await`
export async function deleteRange(editor: vscode.TextEditor, range: Range) : Promise<boolean> {
    return await editor.edit(editBuilder => { 
        editBuilder.delete(range); 
    });
}

//Include inserted Vietnamese characters
export async function updateEditor() : Promise<boolean> { 
    //Move cursor for updating editor.
    await commands.executeCommand('cursorMove', {to: 'right', value: 1});
    await commands.executeCommand('cursorUndo');
    let cursorPosition = window.activeTextEditor.selection.active;
    return vnRegex.test(window.activeTextEditor.document.lineAt(
        cursorPosition.line).text.charAt(
            cursorPosition.character
        ));
}

export async function handleUnikey(repeatNumber : number) : Promise<boolean> {
    if(countDown == 0) {
        countDown = repeatNumber < 0? 0 : repeatNumber;
    }
    //deleteCounter++; //--Debug
    //console.log("Delete [" + deleteCounter + "] character"); //--Debug
    countDown--;
    //console.log("Remain actions: " + countDown); //--Debug
    if(countDown == 0) {
        //deleteCounter = 0; //--Debug
        return true; //Ok to run delete function.
    } else {
        if(countDown < 0) { //Prevent countDown drops below 0
            countDown = 0;
        }
        return false; //Still have repeated calls.
    }
}