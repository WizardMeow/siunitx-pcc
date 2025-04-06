import { TeX } from 'mathjax-full/mjs/input/tex.js';
import { Configuration, ParserConfiguration } from 'mathjax-full/mjs/input/tex/Configuration.js';
import { CommandMap, CharacterMap } from 'mathjax-full/mjs/input/tex/TokenMap.js';
import TexParser from 'mathjax-full/mjs/input/tex/TexParser.js';
import { processAngle } from './angMethods';
import { processNumber } from './numMethods';
import { findOptions, IOptions, processSISetup, siunitxDefaults, } from './options/options';
import { processQuantity } from './qtyMethods';
import { processUnit } from './unitMethods';
import { GetArgumentMML } from "./aria-label";
import NodeUtil from 'mathjax-full/mjs/input/tex/NodeUtil.js';

import { Token } from 'mathjax-full/mjs/input/tex/Token.js'
import { TexConstant } from 'mathjax-full/mjs/input/tex/TexConstants.js';
import { processComplexNumber, processComplexQuantity } from './complexMethods';
import { processNumberList } from './numlistMethods';
import { processNumberProduct } from './numproductMethods';
import { processNumberRange } from './numrangeMethods';
import { processQuantityList } from './qtylistMethods';
import { processQuantityRange } from './qtyrangeMethods';
import { processQuantityProduct } from './qtyproductMethods';
import './options/patch';

const methodMap: Record<string, (parser: TexParser) => void> = {
    '\\num': (parser: TexParser): void => {
        parser.Push(processNumber(parser));
    },
    '\\ang': (parser: TexParser): void => {
        parser.Push(processAngle(parser));
    },
    '\\unit': (parser: TexParser): void => {
        parser.Push(processUnit(parser));
    },
    '\\qty': (parser: TexParser): void => {
        processQuantity(parser); // doesn't return a node, pushes internally
    },
    '\\numlist': (parser: TexParser): void => {
        processNumberList(parser);
    },
    '\\qtylist': (parser: TexParser): void => {
        processQuantityList(parser);
    },
    '\\numproduct': (parser: TexParser): void => {
        processNumberProduct(parser);
    },
    '\\qtyproduct': (parser: TexParser): void => {
        processQuantityProduct(parser);
    },
    '\\numrange': (parser: TexParser): void => {
        processNumberRange(parser);
    },
    '\\qtyrange': (parser: TexParser): void => {
        processQuantityRange(parser);
    },
    '\\complexnum': (parser: TexParser): void => {
        parser.Push(processComplexNumber(parser));
    },
    '\\complexqty': (parser: TexParser): void => {
        processComplexQuantity(parser);
    },

    '@{}S': (_parser: TexParser): void => {
        //TODO: NOT IMPLEMENTED
        // no tabular in MathJax, but maybe use \\begin{array} ?  or pure html somehow
    },
    '\\tablenum': (_parser: TexParser): void => {
        //TODO: NOT IMPLEMENTED
    },
    '\\sisetup': (parser: TexParser): void => {
        processSISetup(parser);
    },
    '\\DeclareSIUnit': (parser: TexParser): void => {
        const packageData = parser.configuration.packageData.get('siunitx');
        const userDefinedUnits = packageData[UserDefinedUnitsKey] as Map<string, string>;
        const userDefinedUnitOptions = packageData[UserDefinedUnitOptionsKey] as Map<string, Partial<IOptions>>;

        const options = findOptions(parser, siunitxDefaults);

        const newUnitMacro = parser.GetArgument('DeclareSIUnit');
        const newSymbol = parser.GetArgument('DeclareSIUnit');

        userDefinedUnits.set(newUnitMacro, newSymbol);
        if (options !== undefined) {
            userDefinedUnitOptions.set(newUnitMacro, options);
        }
    },
    '\\DeclareSIQualifier': (_parser: TexParser): void => {
        //TODO: DeclareSIQualifier (eg g_{salt} for "grams of salt")
    },
    '\\DeclareSIPower': (_parser: TexParser): void => {
        //TODO: DeclareSIPower  (eg \square,\cubic,\squared,\cubed)
    },
};

export const UserDefinedUnitsKey = 'siunitxUnits';
export const UserDefinedUnitOptionsKey = 'siunitxUnitOptions';

function angleChars(parser: TexParser, mchar: Token) {
    const def = mchar.attributes || {};
    def.mathvariant = TexConstant.Variant.NORMAL;
    def.class = 'MathML-Unit';
    const emptyToken = parser.create('token', 'mi');
    const symbolToken = parser.create('token', 'mi', def, mchar.char);
    const msupNode = parser.create('node', 'msup', [emptyToken, symbolToken]);
    parser.Push(msupNode);
}

new CharacterMap('angchar-symbols', angleChars, {
    degreeminute: ['\u2032', {}],
    degreesecond: ['\u2033', {}]
});


new CommandMap('siunitxMap', {
    num: ['siunitxToken', 'num'],
    ang: ['siunitxToken', 'ang'],
    complexnum: ['siunitxToken', 'complexnum'],
    unit: ['siunitxToken', 'unit'],
    qty: ['siunitxToken', 'qty'],
    complexqty: ['siunitxToken', 'complexqty'],
    numlist: ['siunitxToken', 'numlist'],
    numproduct: ['siunitxToken', 'numproduct'],
    numrange: ['siunitxToken', 'numrange'],
    qtylist: ['siunitxToken', 'qtylist'],
    qtyrange: ['siunitxToken', 'qtyrange'],
    qtyproduct: ['siunitxToken', 'qtyproduct'],
    DeclareSIUnit: ['siunitxToken', 'DeclareSIUnit'],
    sisetup: ['siunitxToken', 'sisetup'],
    arialabel: ['Arialabel', 'arialabel'],
    data: ['Dataset', 'data'],
}, {
    siunitxToken: (parser, name) => {
        methodMap[name as string]?.(parser);
    },
    Arialabel: (parser: TexParser, name: string) => {
        const thelabel = parser.GetArgument(name);
        const arg = GetArgumentMML(parser, name);
        NodeUtil.setAttribute(arg, 'aria-label', thelabel);
        parser.Push(arg);
    },
    // currently not used
    Dataset: (parser: TexParser, name: string) => {
        const dataset = parser.GetArgument(name);
        const arg = GetArgumentMML(parser, name);
        //parse dataset to get both sides of equal
        const pair = dataset.split('=');
        NodeUtil.setAttribute(arg, 'data-' + pair[0], pair[1]);
        parser.Push(arg);
    }
});

//TODO: Consider memoization. If input is the same, may as well return the same value without processing.  
// Could even split up memoization for \num between parse, post-process, and print.  The options are split 
// that way, too, so comparing options should be relatively simple.



// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config = (_config: ParserConfiguration, jax: TeX<any, any, any>) => {
    jax.parseOptions.packageData.set('siunitx', {
        [UserDefinedUnitsKey]: new Map<string, string>(),
        [UserDefinedUnitOptionsKey]: new Map<string, string>()
    });
};


Configuration.create('siunitx',
    {
        handler: {
            macro: ['angchar-symbols', 'siunitxMap']
        },
        options: {
            siunitx: siunitxDefaults
        },
        config: config
    });
