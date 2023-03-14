import { marked } from 'marked'
import hljs from 'highlight.js';

const MARKDOWN_BLOCK_ID = "markdown"
const HTML_BLOCK_ID = "html"

class MyRenderer extends marked.Renderer {

    public title:string|undefined = undefined

    public constructor () {
        super()
    }
    
    public heading(text:string, level:1|2|3|4|5|6, raw:string) {
        if (this.title === undefined && text !== "") {
            this.title = text
        }
        return super.heading(text, level, raw, new marked.Slugger())
    }

}

const colorAndKeywordsRegex = /([#%](?:[0-9a-fA-F]{3,6}|\w+))\[(.*?)\]/

function decodeUriOrEcho(uri:string) {    
    try {
        return decodeURIComponent(uri) 
    }
    catch (e) {
        if (e instanceof URIError) {
            return uri
        }
        throw e
    }
}

const render = (text:string):{ html:string, title:string } => {
    hljs.highlightAll()

    const myRenderer = new MyRenderer
    marked.setOptions({
        renderer: myRenderer,
        highlight: (code:string, _lang:string, callback?:(error:any, code:string)=>void) => {
            // NOTE: to avoid space character in lang
            //    
            const lang = decodeUriOrEcho(_lang)    

            if ((!lang) || (lang.match(colorAndKeywordsRegex) === null)) {
                return hljs.highlightAuto(code, [ lang ]).value
            }
            
            const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

            const highlightedCode = lang.split(';').reduce((codeByColor, colorAndKeywords)=>{            

                const colorAndKeywordsMatch:RegExpMatchArray|null = colorAndKeywords.match(colorAndKeywordsRegex)
                if (colorAndKeywordsMatch === null) {            
                    return codeByColor
                }
                else {              
                    const isTextHighlight = (colorAndKeywordsMatch[1][0] === '#')
                    const color = colorAndKeywordsMatch[1].substring(1)                    
                    const isRgb:boolean = (color.match(/^[0-9a-fA-F]{3,6}$/) !== null)

                    return colorAndKeywordsMatch[2].split(',').reduce((codeByWord,keyword)=>{
                        return codeByWord.replace(new RegExp(keyword, 'gi'), `<span style="${(isTextHighlight) ? 'color' : 'background-color'}:${(isRgb) ? '#' : ''}${color}">${keyword}</span>`)
                    }, codeByColor)
                }

            }, escapedCode)

            return `<pre><code>${highlightedCode}</code></pre>`
        },
        pedantic: false,
        gfm: true,        
        breaks: false,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        xhtml: false
    })    
    const html = marked.parse(text)

    return {
        html: html,
        title: myRenderer.title || "No title"
    }   
}

function onFileDropped(elem:HTMLElement, ev:Event):void {
    ev.stopPropagation()
    ev.preventDefault()

    if (!(ev instanceof DragEvent)) {
        return
    }
    const files = ev.dataTransfer?.files    
    if ((files === undefined) || (files.length == 0)) {
        return
    }
    const reader = new FileReader()
    reader.onload = (e:ProgressEvent<FileReader>) => {
        if ((e.target !== null) && (e.target.result !== null) && (typeof e.target.result == 'string')) {
            render_markdown(elem, e.target.result)    
        }
    }
    reader.readAsText(files[0], "utf-8")
        
    
}

function render_markdown(elem:HTMLElement, markdown:string):void {
    const converted = render(markdown)
    elem.innerHTML = converted.html
    if (converted.title !== undefined) {
        document.title = converted.title
    }   
}

window.onload = function() {    

    // Find 'body' element    
    const bodyElems = document.getElementsByTagName('body')
    if (bodyElems.length == 0) {
        console.debug("No body element found")
        return
    }
    const bodyElem = bodyElems[0]

    const markdownElem = document.getElementById(MARKDOWN_BLOCK_ID)
    const htmlElem = document.getElementById(HTML_BLOCK_ID)    
          
    if ((markdownElem !== null) && (htmlElem !== null)) {
        render_markdown(htmlElem, markdownElem.innerHTML)
    }
    else if (markdownElem === null) {
        bodyElem.innerHTML = '<p>No elememt whose id attribute is "markdown" found</p>'
    }
    else if (htmlElem === null) {
        bodyElem.innerHTML = '<p>No elememt whose id attribute is "html" found</p>'
    }
    
    if (htmlElem !== null) {        
        window.addEventListener('dragover', function(e:Event) {
            e.stopPropagation()
            e.preventDefault()
        }, false)
        window.addEventListener('dragleave', function(e:Event) {
            e.stopPropagation()
            e.preventDefault()            
        }, false)        
        window.addEventListener("drop", (e:Event)=>onFileDropped(htmlElem, e), false)
    }
}


