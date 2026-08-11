import { useCallback, useMemo, useState } from 'react'
import {
  ArticleContentRenderer,
  type ArticleButtonAttrs,
  type ArticleButtonClickPayload,
  type ArticleButtonLink,
  type ArticleButtonNode,
  type ArticleDocument,
  type CustomSlot,
  type RenderIssue,
  type ResolveArticleButtonLink,
} from '../src'

const DEFAULT_RESOLVER_CODE = [
  'const { id, title, text, style } = attrs',
  '',
  '// href 完全由使用者拼接，组件不会自动追加参数',
  'return `/detail/${id}`',
].join('\n')

type ExecutableResolver = (
  attrs: Readonly<ArticleButtonAttrs>,
  node: Readonly<ArticleButtonNode>,
) => ArticleButtonLink

function compileResolver(source: string): ExecutableResolver {
  return new Function('attrs', 'node', `"use strict";\n${source}`) as ExecutableResolver
}

// const article: ArticleDocument = {
//   type: 'doc',
//   content: [
//     {
//       type: 'heading',
//       attrs: { level: 1, textAlign: 'center' },
//       content: [{ type: 'text', text: 'Article Content Protocol v1' }],
//     },
//     {
//       type: 'paragraph',
//       content: [
//         { type: 'text', text: '这个 Demo 展示 ' },
//         { type: 'text', text: '粗体', marks: [{ type: 'bold' }] },
//         { type: 'text', text: '、' },
//         { type: 'text', text: '斜体', marks: [{ type: 'italic' }] },
//         { type: 'text', text: '、' },
//         { type: 'text', text: '删除线', marks: [{ type: 'strike' }] },
//         { type: 'text', text: '、' },
//         { type: 'text', text: '下划线', marks: [{ type: 'underline' }] },
//         { type: 'text', text: '、' },
//         { type: 'text', text: 'inlineCode()', marks: [{ type: 'code' }] },
//         { type: 'text', text: ' 和 ' },
//         {
//           type: 'text',
//           text: '安全链接',
//           marks: [
//             {
//               type: 'link',
//               attrs: { href: 'https://example.com', target: '_blank' },
//             },
//           ],
//         },
//         { type: 'text', text: '。' },
//       ],
//     },
//     {
//       type: 'blockquote',
//       content: [
//         {
//           type: 'paragraph',
//           content: [
//             {
//               type: 'text',
//               text: '协议数据只描述内容；渲染、安全和业务链接由组件负责。',
//             },
//           ],
//         },
//       ],
//     },
//     {
//       type: 'heading',
//       attrs: { level: 2 },
//       content: [{ type: 'text', text: '列表与代码块' }],
//     },
//     {
//       type: 'bulletList',
//       content: [
//         {
//           type: 'listItem',
//           content: [
//             {
//               type: 'paragraph',
//               content: [{ type: 'text', text: '无序列表支持嵌套块节点。' }],
//             },
//           ],
//         },
//         {
//           type: 'listItem',
//           content: [
//             {
//               type: 'paragraph',
//               content: [{ type: 'text', text: '每个节点都会经过协议校验。' }],
//             },
//           ],
//         },
//       ],
//     },
//     {
//       type: 'orderedList',
//       attrs: { start: 3 },
//       content: [
//         {
//           type: 'listItem',
//           content: [
//             {
//               type: 'paragraph',
//               content: [{ type: 'text', text: '有序列表可以指定起始序号。' }],
//             },
//           ],
//         },
//         {
//           type: 'listItem',
//           content: [
//             {
//               type: 'paragraph',
//               content: [{ type: 'text', text: '省略时默认从 1 开始。' }],
//             },
//           ],
//         },
//       ],
//     },
//     {
//       type: 'codeBlock',
//       attrs: { language: 'ts' },
//       content: [
//         {
//           type: 'text',
//           text: "const resolver = (attrs) => `/action/${attrs.id}`",
//         },
//       ],
//     },
//     {
//       type: 'heading',
//       attrs: { level: 2 },
//       content: [{ type: 'text', text: '图片、操作链接与表格' }],
//     },
//     {
//       type: 'image',
//       attrs: {
//         src: '/demo-image.svg',
//         alt: 'Article Content Renderer illustration',
//         width: 960,
//         height: 360,
//         imageAlign: 'center',
//       },
//     },
//     {
//       type: 'paragraph',
//       content: [
//         {
//           type: 'text',
//           text: '下面两个 articleButton 使用同一个闭包 resolver，只改变视觉样式：',
//         },
//       ],
//     },
//     {
//       type: 'articleButton',
//       attrs: {
//         id: 'view-product',
//         title: '查看商品详情',
//         text: '按钮样式链接',
//         style: 'button',
//       },
//     },
//     {
//       type: 'paragraph',
//       content: [{ type: 'text', text: '也可以渲染成更轻量的文本操作：' }],
//     },
//     {
//       type: 'articleButton',
//       attrs: {
//         id: '1',
//         title: '查看更多内容',
//         text: '文本样式链接',
//         style: 'text',
//       },
//     },
//     {
//       type: 'table',
//       content: [
//         {
//           type: 'tableRow',
//           content: [
//             {
//               type: 'tableCell',
//               content: [{ type: 'paragraph', content: [{ type: 'text', text: '节点' }] }],
//             },
//             {
//               type: 'tableCell',
//               content: [{ type: 'paragraph', content: [{ type: 'text', text: 'DOM' }] }],
//             },
//             {
//               type: 'tableCell',
//               content: [{ type: 'paragraph', content: [{ type: 'text', text: '说明' }] }],
//             },
//           ],
//         },
//         {
//           type: 'tableRow',
//           content: [
//             {
//               type: 'tableCell',
//               content: [{ type: 'paragraph', content: [{ type: 'text', text: 'articleButton' }] }],
//             },
//             {
//               type: 'tableCell',
//               content: [{ type: 'paragraph', content: [{ type: 'text', text: '<a>' }] }],
//             },
//             {
//               type: 'tableCell',
//               content: [
//                 { type: 'paragraph', content: [{ type: 'text', text: '外部生成安全链接' }] },
//               ],
//             },
//           ],
//         },
//       ],
//     },
//     { type: 'horizontalRule' },
//     {
//       type: 'paragraph',
//       attrs: { textAlign: 'center' },
//       content: [{ type: 'text', text: 'Demo end' }],
//     },
//   ],
// }
const article: ArticleDocument = {"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Discover how to improve your visibility, get dedicated fans, and collect more Robux.", "type": "text"}]}, {"type": "articleButton", "attrs": {"id": "1932", "text": "🔥How To Earn Robux", "style": "text"}}, {"type": "articleButton", "attrs": {"id": "1934", "text": "🔥Roblox Robux Benefits", "style": "text"}}, {"type": "articleButton", "attrs": {"id": "1934", "text": "🔥I Wish to Grow Roblox", "style": "text"}}, {"type": "paragraph", "content": [{"text": "Special chance to change your Roblox play into true fame. Begin using strategies right now that help you shine in the community.", "type": "text"}]}, {"type": "articleButton", "attrs": {"id": "1934", "text": "See How To Grow Roblox ➝", "style": "button", "title": "You will remain in the same website"}}, {"type": "image", "attrs": {"src": "https://www.doitme.link/icon/f9ef1b5bb8a816ed10d8bb26eb0649279980dd0d1ef3af6067af5cd31f664512.webp", "imageAlign": "center"}}, {"type": "paragraph", "content": [{"text": "Although many players find it hard to be seen on Roblox, some gamers know exactly how to fast get followers and Robux. Explore the detailed manual for being noticed and turning your account into a real leader in the community.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Before trusting “too-good-to-be-true” promises, explore the advantages of this exclusive Roblox guide designed to enhance your experience safely:", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Higher exposure for your works", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Chance to collect extra Robux", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Respect from the community", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Useful alliances with other players", "type": "text"}]}, {"type": "image", "attrs": {"src": "https://www.doitme.link/icon/f6711d91475b20b7c37ba35cf01b2f751306f02a492ba06db903a3eaebf4381e.jpeg", "imageAlign": "center"}}, {"type": "paragraph", "content": [{"text": "To ensure a compliant experience, please use the button below to visit the official Roblox website and explore millions of community-created worlds.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "PLAY ON ROBLOX", "type": "text", "marks": [{"type": "link", "attrs": {"href": "https://www.roblox.com/", "target": "_blank"}}]}]}, {"type": "paragraph", "content": [{"text": "Notice: You are leaving our site to visit the official platform. We are an independent fan site. Not affiliated with or endorsed by Roblox.", "type": "text"}]}, {"type": "paragraph", "attrs": {"textAlign": "left"}, "content": [{"text": "Hope to glow in Roblox? Gain methods to excel more, build amazing adventures, and act as a guide in the network.", "type": "text"}]}, {"type": "horizontalRule"}, {"type": "heading", "attrs": {"level": 2, "textAlign": "left"}, "content": [{"text": "Find tips to get noticed on Roblox, draw extra users, and change your image on the site.", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "image", "attrs": {"src": "https://www.doitme.link/icon/f1b6f3f9a461eaa46142e9f9936a7e4b8d9499dd0683295b78b8f960149a22af.png", "imageAlign": "center"}}, {"type": "horizontalRule"}, {"type": "paragraph", "attrs": {"textAlign": "left"}, "content": [{"text": "If you wish to learn", "type": "text"}, {"text": " how to excel on Roblox", "type": "text", "marks": [{"type": "bold"}]}, {"text": ", you must realize that it isn’t enough to simply play: you need plans, vision and impact.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Roblox is a giant space where countless users and makers vie every day for the network's focus. In there, each round, work, and chat is a chance to show your ", "type": "text"}, {"text": " gift", "type": "text", "marks": [{"type": "link", "attrs": {"href": "#", "target": "_blank"}}]}, {"text": " and get notice.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The fine news? Whether you are just starting or already a pro on the site, with the best moves, you can be a boss.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "This post will show exactly how to change your hours on Roblox into a winning path, whether you are a user, maker, or star.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 1}, "content": [{"text": "Greater than a hobby: a realm of options", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Roblox is a site where creativity has no bounds. It lets anyone build zones, make ", "type": "text"}, {"text": " games", "type": "text", "marks": [{"type": "link", "attrs": {"href": "#", "target": "_blank"}}]}, {"text": ", edit skins, and check worlds made by other folks.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The main point is that you are not stuck to one aim: Roblox is built for those who love to try.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Wish to make a theme park? You may. Wish to craft a quest game with a deep plot? That works too. Wish to just play and chat? You can also.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "This choice means that fresh fads and chances to excel appear every day. But to do that, you must know what part you wish to play in the network.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 1}, "content": [{"text": "Pick your route: gamer, maker, or star", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The basic step to excelling is picking your aim. Inside Roblox, there are three key types:", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Player", "type": "text", "marks": [{"type": "bold"}]}, {"text": ": Check worlds made by folks, win game types, find secrets, and join in shows.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Creator", "type": "text", "marks": [{"type": "bold"}]}, {"text": ": Craft games and worlds using Roblox Studio, making something rare that can draw many users.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Influencer", "type": "text", "marks": [{"type": "bold"}]}, {"text": ": Makes Roblox clips on social apps, streaming live, making films, or giving tips.", "type": "text"}]}]}]}, {"type": "paragraph", "content": [{"text": "You may even mix these parts, but having a clear aim helps keep focus and speed up your rise.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "How to excel as a player", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "If your aim is to glow as a user, some plans can make a change:", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Focus on one kind of game", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "By aiming at a fixed type—like sims, car games, or war games—you make a name as a pro.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Join in unique shows", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "These shows give rare prizes and a lot of focus, as they gather a big part of the network.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Boost your skills", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "Work often, learn pro moves, and use tricks others do not see.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Chat with other users", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "Making pals and joining clubs grows your odds of being known and valued.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "How to Excel as a Game Maker", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "If making worlds is your goal, try these ideas:", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Learn Roblox Studio", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "Knowing the build tools, code, and moves will let you make more deep and useful games.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Watch trends", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "See what is hot and change ideas to make something fresh and fun.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Focus on user joy", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "The easier you make it for a user to grasp and like your ", "type": "text"}, {"text": " game", "type": "text", "marks": [{"type": "link", "attrs": {"href": "#", "target": "_blank"}}]}, {"text": ", the more likely they stay and bring pals.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Update often", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "Games that get new stuff keep users busy and active longer.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 1}, "content": [{"text": "Wise Profit: How to Get Robux and Spend", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Robux is the main money of Roblox and can be gained in many fair ways: selling gear, making paid games, or giving pro passes.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Sale of style gear:", "type": "text", "marks": [{"type": "bold"}]}, {"text": " Make rare clothes, hats, or gear that users can buy.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Game Passes and Pro Stuff: ", "type": "text", "marks": [{"type": "bold"}]}, {"text": "Give extra perks for those who want a rare tour.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "In-game ads and deals: ", "type": "text", "marks": [{"type": "bold"}]}, {"text": "Discuss ad spots or work with other makers.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The trick isn't just to get Robux, but to know how to spend it. This could mean fixing your game's looks, making new maps, or even ad work to find more users.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 1}, "content": [{"text": "The value of personal style", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "In Roblox, it isn't enough to be good — you must", "type": "text"}, {"text": " be known", "type": "text", "marks": [{"type": "bold"}]}, {"text": ". And that is where personal style comes in—making your \"brand\" on the site. View it as making a rare look that means folks know who you are and what to find when they see your name or skin.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Here are some key parts:", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Great name", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "Pick something brief, easy to say, and that fits the kind of stuff or game you show. Skip plain names or names with too many digits.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Pro skin", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "Your skin is your \"face\" on Roblox. Spend time (and, if you can, some Robux) on making a look that glows. Tones, gear, and style should show your vibe.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Steady chat style", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "How you talk in games, rooms, and social sites is also part of your style. It can be fun, kind, tough, or even dark—the key thing is to be ", "type": "text"}, {"text": "steady", "type": "text", "marks": [{"type": "bold"}]}, {"text": ".", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Story and goal", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "Making a tale around your page grows focus. For example: \"the user who finds all the paths of Roblox\" or \"the maker who makes dreams into ", "type": "text"}, {"text": " games", "type": "text", "marks": [{"type": "link", "attrs": {"href": "#", "target": "_blank"}}]}, {"text": ".\"", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Pro tip: ", "type": "text", "marks": [{"type": "bold"}]}, {"text": "The more known your style is, the easier it will be to build a firm fan base that sees all you do.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 1}, "content": [{"text": "Network and teamwork", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Roblox is run by people. And no matter how gifted you are, rising alone is much tougher. Linking with other users and makers opens paths to chances you might not have thought of.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "See how teamwork can boost your focus:", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "Art deals: ", "type": "text", "marks": [{"type": "bold"}]}, {"text": "Making a game together or setting a special show can draw varied groups to the same task. Each partner brings their own unique fans and ", "type": "text"}, {"text": " gifts", "type": "text", "marks": [{"type": "link", "attrs": {"href": "#", "target": "_blank"}}]}, {"text": ".", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Joining clubs: ", "type": "text", "marks": [{"type": "bold"}]}, {"text": "There are fixed groups for varied ways of play, making, and even study. Being busy in these zones grows your focus and lets you swap helpful tips.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Gifts Swap:", "type": "text", "marks": [{"type": "bold"}]}, {"text": " Maybe you are great at map art, but do not know much about code. By joining with someone with other gifts, the final work will be much more firm and pro.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Events and cups: ", "type": "text", "marks": [{"type": "bold"}]}, {"text": "Entering or making contests is a fine way to show your gifts while also chatting with the network.\nTreat all links with care and trust. Fame on Roblox spreads fast—and can be your best ad or your worst wall.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 1}, "content": [{"text": "Ending – Your time to glow", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Roblox is a land full of chances. But excelling needs more than luck: it needs plans, effort, and vision.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Whether you are a user, maker, or star, every move you make on the site can bring you closer to fame, wins, and even cash gains.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The key thing is to start, and stay.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "So, how about taking the next move right now? Open Roblox, pick your path, and show the world what you can make.", "type": "text"}]}]}

const customSlots: CustomSlot[] = [
  {
    id: 'demo-promo',
    location: 5,
    content: <aside className="demo-custom-slot">Custom slot before item 5</aside>,
  },
]

export default function App() {
  const [strict, setStrict] = useState(false)
  const [allowNavigation, setAllowNavigation] = useState(false)
  const [openInNewTab, setOpenInNewTab] = useState(false)
  const [resolverCode, setResolverCode] = useState(DEFAULT_RESOLVER_CODE)
  const [appliedResolverCode, setAppliedResolverCode] = useState(DEFAULT_RESOLVER_CODE)
  const [resolverCodeError, setResolverCodeError] = useState('')
  const [activeResolver, setActiveResolver] = useState<ExecutableResolver>(() =>
    compileResolver(DEFAULT_RESOLVER_CODE),
  )
  const [lastClick, setLastClick] = useState<ArticleButtonClickPayload | null>(null)
  const [renderIssues, setRenderIssues] = useState<RenderIssue[]>([])

  const formattedDocument = useMemo(() => JSON.stringify(article, null, 2), [])
  const resolverHasChanges = resolverCode !== appliedResolverCode

  const applyResolverCode = useCallback((): void => {
    try {
      const resolver = compileResolver(resolverCode)
      setActiveResolver(() => resolver)
      setAppliedResolverCode(resolverCode)
      setResolverCodeError('')
      setLastClick(null)
      setRenderIssues([])
    } catch (error) {
      setResolverCodeError(error instanceof Error ? error.message : String(error))
    }
  }, [resolverCode])

  const resetResolverCode = useCallback((): void => {
    const resolver = compileResolver(DEFAULT_RESOLVER_CODE)
    setResolverCode(DEFAULT_RESOLVER_CODE)
    setAppliedResolverCode(DEFAULT_RESOLVER_CODE)
    setActiveResolver(() => resolver)
    setResolverCodeError('')
    setLastClick(null)
    setRenderIssues([])
  }, [])

  const resolveArticleButtonLink = useCallback<ResolveArticleButtonLink>(
    (attrs, node) => {
      const result = activeResolver(attrs, node)
      if (!openInNewTab || typeof result !== 'string') return result

      return { href: result, target: '_blank', rel: 'demo-link' }
    },
    [activeResolver, openInNewTab],
  )

  const handleArticleButtonClick = useCallback(
    (payload: ArticleButtonClickPayload): void => {
      if (!allowNavigation) payload.event.preventDefault()
      setLastClick(payload)
    },
    [allowNavigation],
  )

  const handleRenderError = useCallback((issue: RenderIssue): void => {
    const key = `${issue.code}:${issue.path}:${issue.message}`
    setRenderIssues((current) =>
      current.some((existing) => `${existing.code}:${existing.path}:${existing.message}` === key)
        ? current
        : [...current, issue],
    )
  }, [])

  const clearRuntimeState = useCallback((): void => {
    setLastClick(null)
    setRenderIssues([])
  }, [])

  return (
    <main className="demo-shell">
      <header className="demo-hero">
        <p className="demo-eyebrow">React component playground</p>
        <h1>Article Content Renderer</h1>
        <p>修改左侧控制项，直接观察协议内容、样式和使用者完整拼接的 articleButton 链接。</p>
      </header>

      <div className="demo-layout">
        <aside className="demo-panel demo-controls">
          <div className="demo-panel__header">
            <div>
              <p className="demo-panel__eyebrow">Runtime options</p>
              <h2>控制台</h2>
            </div>
            <button className="demo-reset" type="button" onClick={clearRuntimeState}>
              清空状态
            </button>
          </div>

          <section className="demo-resolver-editor">
            <div className="demo-resolver-editor__header">
              <div>
                <h3>articleButton resolver</h3>
                <p>使用 JavaScript 读取节点属性并返回完整链接。</p>
              </div>
              <span
                className={`demo-code-state${
                  resolverHasChanges ? ' demo-code-state--pending' : ''
                }`}
              >
                {resolverHasChanges ? '待应用' : '已应用'}
              </span>
            </div>

            <div className="demo-code-reference" aria-label="可用回调参数">
              <code>attrs.id</code>
              <code>attrs.title</code>
              <code>attrs.text</code>
              <code>attrs.style</code>
              <code>node</code>
            </div>

            <label className="demo-code-field">
              <span>回调函数体</span>
              <textarea
                value={resolverCode}
                onChange={(event) => setResolverCode(event.target.value)}
                aria-label="articleButton resolver 代码"
                rows={8}
                spellCheck={false}
              />
            </label>

            <p className="demo-code-example">
              默认示例读取全部 attrs，并返回 <code>{'/detail/${attrs.id}'}</code>。这里返回什么安全链接，最终
              href 就是什么。
            </p>

            {resolverCodeError ? (
              <p className="demo-code-error" role="alert">
                无法应用：{resolverCodeError}
              </p>
            ) : null}

            <div className="demo-code-actions">
              <button className="demo-apply" type="button" onClick={applyResolverCode}>
                应用回调
              </button>
              <button className="demo-secondary" type="button" onClick={resetResolverCode}>
                恢复示例
              </button>
            </div>
          </section>

          <label className="demo-check">
            <input
              checked={strict}
              onChange={(event) => setStrict(event.target.checked)}
              type="checkbox"
            />
            <span>严格模式</span>
          </label>

          <label className="demo-check">
            <input
              checked={openInNewTab}
              onChange={(event) => setOpenInNewTab(event.target.checked)}
              type="checkbox"
            />
            <span>articleButton 使用 _blank</span>
          </label>

          <label className="demo-check">
            <input
              checked={allowNavigation}
              onChange={(event) => setAllowNavigation(event.target.checked)}
              type="checkbox"
            />
            <span>允许链接实际跳转</span>
          </label>

          <p className="demo-hint">
            可编辑回调只用于本地开发 Demo。正式项目应在源码中传入 resolver。默认拦截跳转，方便在下方检查最终
            href。
          </p>

          <section id="article-button-result" className="demo-runtime-card">
            <h3>最近一次点击</h3>
            {lastClick ? (
              <dl>
                <div>
                  <dt>节点 ID</dt>
                  <dd>{lastClick.attrs.id}</dd>
                </div>
                <div>
                  <dt>节点样式</dt>
                  <dd>{lastClick.attrs.style}</dd>
                </div>
                <div>
                  <dt>生成链接</dt>
                  <dd className="demo-break">{lastClick.href}</dd>
                </div>
                <div>
                  <dt>已阻止跳转</dt>
                  <dd>{lastClick.event.defaultPrevented ? '是' : '否'}</dd>
                </div>
              </dl>
            ) : (
              <p>点击正文中的按钮或文本操作后显示。</p>
            )}
          </section>

          <section className="demo-runtime-card">
            <h3>渲染问题（{renderIssues.length}）</h3>
            {renderIssues.length ? (
              <ul className="demo-issues">
                {renderIssues.map((issue) => (
                  <li key={`${issue.code}:${issue.path}:${issue.message}`}>
                    <strong>{issue.code}</strong>
                    <span>{issue.path || '/'}</span>
                    <small>{issue.message}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>当前协议数据没有发现问题。</p>
            )}
          </section>
        </aside>

        <section className="demo-panel demo-preview">
          <div className="demo-panel__header demo-preview__header">
            <div>
              <p className="demo-panel__eyebrow">Rendered result</p>
              <h2>文章预览</h2>
            </div>
            <span className="demo-version">Protocol v1</span>
          </div>

          <article className="demo-render-surface">
            <ArticleContentRenderer
              document={article}
              strict={strict}
              customSlots={customSlots}
              resolveArticleButtonLink={resolveArticleButtonLink}
              onArticleButtonClick={handleArticleButtonClick}
              onRenderError={handleRenderError}
            />
          </article>

          <details className="demo-json">
            <summary>查看 ProseMirror JSON</summary>
            <pre>{formattedDocument}</pre>
          </details>
        </section>
      </div>
    </main>
  )
}
