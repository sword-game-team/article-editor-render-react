import type { MouseEvent as ReactMouseEvent } from 'react'

export type ProtocolVersion = 1

export type TextAlign = 'left' | 'center' | 'right' | 'justify'
export type ImageAlign = 'left' | 'center' | 'right'
export type ArticleButtonStyle = 'text' | 'button'
export type LinkTarget = '_blank' | '_self'

export interface BoldMark {
  type: 'bold'
}

export interface ItalicMark {
  type: 'italic'
}

export interface StrikeMark {
  type: 'strike'
}

export interface UnderlineMark {
  type: 'underline'
}

export interface CodeMark {
  type: 'code'
}

export interface LinkMark {
  type: 'link'
  attrs: {
    href: string
    target?: LinkTarget
  }
}

export type ArticleMark =
  | BoldMark
  | ItalicMark
  | StrikeMark
  | UnderlineMark
  | CodeMark
  | LinkMark

export interface TextNode {
  type: 'text'
  text: string
  marks?: ArticleMark[]
}

export interface ParagraphNode {
  type: 'paragraph'
  attrs?: {
    textAlign?: TextAlign
  }
  content?: TextNode[]
}

export interface HeadingNode {
  type: 'heading'
  attrs: {
    level: 1 | 2 | 3 | 4 | 5 | 6
    textAlign?: TextAlign
  }
  content?: TextNode[]
}

export interface BlockquoteNode {
  type: 'blockquote'
  content: BlockNode[]
}

export interface BulletListNode {
  type: 'bulletList'
  content: ListItemNode[]
}

export interface OrderedListNode {
  type: 'orderedList'
  attrs?: {
    start?: number
  }
  content: ListItemNode[]
}

export interface ListItemNode {
  type: 'listItem'
  content: BlockNode[]
}

export interface CodeBlockTextNode {
  type: 'text'
  text: string
}

export interface CodeBlockNode {
  type: 'codeBlock'
  attrs?: {
    language?: string
  }
  content?: CodeBlockTextNode[]
}

export interface HorizontalRuleNode {
  type: 'horizontalRule'
}

export interface ImageNode {
  type: 'image'
  attrs: {
    src: string
    alt?: string
    title?: string
    width?: number
    height?: number
    imageAlign?: ImageAlign
  }
}

export interface ArticleButtonAttrs {
  id: string
  title?: string
  text: string
  style: ArticleButtonStyle
}

export interface ArticleButtonNode {
  type: 'articleButton'
  attrs: ArticleButtonAttrs
}

export interface TableNode {
  type: 'table'
  content: TableRowNode[]
}

export interface TableRowNode {
  type: 'tableRow'
  content: TableCellNode[]
}

export interface TableCellNode {
  type: 'tableCell'
  content: BlockNode[]
}

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | BlockquoteNode
  | BulletListNode
  | OrderedListNode
  | CodeBlockNode
  | HorizontalRuleNode
  | ImageNode
  | ArticleButtonNode
  | TableNode

export interface ArticleDocument {
  type: 'doc'
  content: BlockNode[]
}

export type ArticleContentNode =
  | ArticleDocument
  | BlockNode
  | ListItemNode
  | TableRowNode
  | TableCellNode
  | TextNode

export interface ArticleButtonLinkDescriptor {
  href: string
  target?: LinkTarget
  rel?: string
}

export type ArticleButtonLink = string | ArticleButtonLinkDescriptor | null

export type ResolveArticleButtonLink = (
  attrs: Readonly<ArticleButtonAttrs>,
  node: Readonly<ArticleButtonNode>,
) => ArticleButtonLink

export type RenderIssueCode =
  | 'INVALID_ROOT'
  | 'INVALID_TYPE'
  | 'INVALID_CONTENT'
  | 'INVALID_VALUE'
  | 'MISSING_PROPERTY'
  | 'UNKNOWN_PROPERTY'
  | 'UNKNOWN_NODE'
  | 'UNKNOWN_MARK'
  | 'TABLE_COLUMN_MISMATCH'
  | 'UNSAFE_URL'
  | 'LINK_RESOLUTION_FAILED'
  | 'UNSUPPORTED_PROTOCOL'

export interface RenderIssue {
  code: RenderIssueCode
  path: string
  message: string
  nodeType?: string
}

export interface ValidationResult {
  valid: boolean
  issues: RenderIssue[]
}

export interface ArticleButtonClickPayload {
  attrs: Readonly<ArticleButtonAttrs>
  node: Readonly<ArticleButtonNode>
  href: string | null
  event: ReactMouseEvent<HTMLAnchorElement>
}
