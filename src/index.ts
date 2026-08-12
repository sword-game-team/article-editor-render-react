import './styles.css'

export {
  ArticleContentRenderer,
  type ArticleContentRendererProps,
} from './components/ArticleContentRenderer.js'
export { default } from './components/ArticleContentRenderer.js'

export {
  CURRENT_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  validateArticleDocument,
} from './protocols/registry.js'
export { ARTICLE_CONTENT_PROTOCOL_V1 } from './protocols/v1/metadata.js'
export type {
  ArticleButtonAttrs,
  ArticleButtonActionAttrs,
  ArticleButtonActionNode,
  ArticleButtonClickPayload,
  ArticleButtonLink,
  ArticleButtonLinkAttrs,
  ArticleButtonLinkDescriptor,
  ArticleButtonLinkNode,
  ArticleButtonNode,
  ArticleButtonStyle,
  ArticleContentNode,
  ArticleDocument,
  ArticleMark,
  BlockNode,
  BlockquoteNode,
  BoldMark,
  BulletListNode,
  CodeBlockNode,
  CodeBlockTextNode,
  CodeMark,
  CustomSlot,
  HeadingNode,
  HorizontalRuleNode,
  ImageAlign,
  ImageNode,
  ItalicMark,
  LinkMark,
  LinkTarget,
  ListItemNode,
  OrderedListNode,
  ParagraphNode,
  ProtocolVersion,
  RenderIssue,
  RenderIssueCode,
  ResolveArticleButtonLink,
  StrikeMark,
  TableCellNode,
  TableNode,
  TableRowNode,
  TextAlign,
  TextNode,
  UnderlineMark,
  ValidationResult,
} from './types.js'
