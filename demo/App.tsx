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
const article: ArticleDocument = {"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "COMPACT HYBRID SUV BUYING GUIDE", "type": "text"}]}, {"type": "heading", "attrs": {"level": 1}, "content": [{"text": "2026 Toyota RAV4: Comfort Meets the Trim-Price Reality", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Toyota redesigned its best-known compact SUV for 2026 and made every U.S. RAV4 electrified. The result is roomier in purpose than in personality: efficient, useful, and technologically current, but increasingly expensive when buyers climb the trim ladder without a clear reason.", "type": "text"}]}, {"type": "image", "attrs": {"alt": "Blue 2026 Toyota RAV4 Hybrid driving through a suburban neighborhood", "src": "https://asserts.gameseeks.com/icon/b4761d5e6d11ca09d3f8e4ecbf39c23989049288f4d2d97255ddc2530c227ab7.png", "title": "The sixth-generation RAV4's sharper shape is new, but its buying case still rests on useful space, efficient commuting, and disciplined trim selection.", "width": 1600, "height": 900, "imageAlign": "center"}}, {"type": "paragraph", "content": [{"text": "The sixth-generation RAV4's sharper shape is new, but its buying case still rests on useful space, efficient commuting, and disciplined trim selection.", "type": "text", "marks": [{"type": "italic"}]}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "The Reputation Is Familiar; the Decision Is New", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The RAV4 arrives at a dealership carrying more reputation than most compact SUVs. Families know the badge, small-business owners recognize the practical footprint, and commuters expect a sensible fuel bill. That familiarity can make the purchase feel automatic. For 2026, however, the vehicle underneath the reputation is substantially different: this is the sixth generation, the U.S. lineup is hybrid-only, front-wheel drive joins the regular hybrid range, and the cabin adopts Toyota's latest multimedia and safety technology.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Those changes sharpen the buying question rather than eliminate it. The RAV4 is still designed around everyday comfort and packaging, not steering feel or theatrical acceleration. Its strongest argument is that one vehicle can manage school runs, client visits, groceries, and highway weekends with little operational drama. Its main risk is financial: a shopper who begins with the $31,900 LE can reach the $43,300 Limited before options, taxes, and Toyota's listed $1,095 processing and handling fee. The right RAV4 is therefore less about finding the most equipment and more about stopping at the point where added comfort still earns its cost.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Quick Verdict", "type": "text"}]}, {"type": "blockquote", "content": [{"type": "paragraph", "content": [{"text": "Editorial score: 4.3/5. Best for value-focused families and mixed-route commuters who prioritize efficiency, cargo utility, and straightforward ownership. Less suitable for drivers seeking a lively chassis or shoppers likely to load an upper trim with features they rarely use.", "type": "text"}]}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Strongest advantage: a hybrid-only powertrain strategy paired with up to 37.8 cubic feet of cargo room behind the rear seat.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Biggest weakness: the price ladder expands by $11,400 from LE to Limited before options and fees.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Recommended strategy: start with LE, SE, and XLE Premium; add AWD only for a real traction, weather, or towing need.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Ownership watchpoint: verify the exact EPA rating, tire specification, insurance quote, and dealer-installed equipment for the VIN being purchased.", "type": "text"}]}]}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Pros and Cons That Matter in Daily Use", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Advantages", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Every 2026 RAV4 uses either a regular hybrid or plug-in hybrid powertrain, removing the old gas-versus-hybrid decision from the core lineup.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "The regular hybrid produces 226 combined horsepower with front-wheel drive or 236 horsepower with all-wheel drive, enough for family and commuter duty without requiring the pricier plug-in model.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Toyota lists up to 47 city/40 highway mpg, giving high-mileage urban drivers a credible efficiency reason to consider the least expensive front-drive configuration.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Up to 37.8 cubic feet behind the second row keeps the RAV4 useful for strollers, samples, tools, or weekend luggage.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Toyota Safety Sense 4.0, a 12.3-inch digital gauge cluster, blind-spot monitoring, and rear cross-traffic alert are standard across the announced lineup.", "type": "text"}]}]}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Compromises", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "The RAV4's practical tuning does not promise the steering involvement a driving enthusiast may expect from a sport-oriented alternative.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Efficiency varies materially by drivetrain, grade, wheels, and tires; the headline maximum is not the rating for every RAV4.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Woodland, XSE, and Limited pricing can weaken the value proposition when their specialized or premium features are not central to the buyer's use case.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "The all-new generation reduces the usefulness of long-term reliability history specific to this exact 2026 hardware and software package.", "type": "text"}]}]}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Verified 2026 RAV4 Buyer Snapshot", "type": "text"}]}, {"type": "table", "content": [{"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Item", "type": "text", "marks": [{"type": "bold"}]}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Verified 2026 information", "type": "text", "marks": [{"type": "bold"}]}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Buying implication", "type": "text", "marks": [{"type": "bold"}]}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Regular hybrid powertrain", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "2.5-liter four-cylinder hybrid; 226 hp FWD or 236 hp AWD", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "FWD emphasizes efficiency and price; AWD adds traction and output", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Transmission", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Planetary-type electronically controlled continuously variable transmission", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Designed for smooth, efficient operation rather than stepped-shift drama", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Fuel economy", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Up to 47 city/40 highway mpg; grade-dependent", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Compare the exact window-sticker rating, not only the maximum", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Cargo room", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Up to 37.8 cu. ft. behind the rear seat", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Competitive space for family or small-business gear", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Towing", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Up to 3,500 lb.; configuration-dependent", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Confirm grade, equipment, load, and hitch requirements before towing", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Screens", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "10.5-inch multimedia standard; 12.9-inch available; 12.3-inch gauge cluster standard", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "A larger center screen is a preference, not an automatic value upgrade", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Hybrid battery warranty", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "10 years/150,000 miles, whichever comes first, subject to warranty terms", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Useful long-horizon coverage; review the warranty guide for exclusions", "type": "text"}]}]}]}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "The Trim Ladder Is the Real Test", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Toyota's announced regular-hybrid range runs from LE through Limited. The LE establishes the essential proposition: the new hybrid system, standard digital cluster, current safety suite, and the lowest entry price. The $34,700 SE is the first sensible comparison point for a buyer who values the sport-themed equipment. The $36,100 XLE Premium is the comfort-oriented middle of the range and is the most logical starting point for a family that wants convenience without paying for the most elaborate cabin.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Above that middle, intent matters. Woodland at $39,900 targets outdoor use with all-terrain tires and roof equipment. XSE at $41,300 prioritizes sport appearance and adds the larger multimedia screen plus heated and ventilated front seats. Limited at $43,300 layers on features such as a panoramic roof, JBL audio, and dual wireless charging. None is inherently a poor choice, but each needs a use-case defense. Paying several thousand dollars for design, audio, or screen upgrades does not improve fuel cost, cargo capacity, or basic transportation.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Regular-Hybrid Starting Prices", "type": "text"}]}, {"type": "table", "content": [{"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Grade", "type": "text", "marks": [{"type": "bold"}]}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Starting MSRP", "type": "text", "marks": [{"type": "bold"}]}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Value reading", "type": "text", "marks": [{"type": "bold"}]}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "LE", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$31,900", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Efficiency-first baseline; compare FWD and AWD deliberately", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "SE", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$34,700", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Sport-themed step without entering premium-trim pricing", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "XLE Premium", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$36,100", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Comfort-focused middle ground for many families", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Woodland", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$39,900", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Best justified by outdoor equipment and traction use", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "XSE", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$41,300", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Appearance and cabin-feature upgrade; efficiency is grade-dependent", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Limited", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$43,300", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Luxury-feature choice, not the default value answer", "type": "text"}]}]}]}]}, {"type": "paragraph", "content": [{"text": "MSRPs exclude Toyota's listed $1,095 processing and handling fee, dealer charges, options, taxes, registration, and insurance. Inventory may include packages that change the transaction price.", "type": "text"}]}, {"type": "image", "attrs": {"alt": "2026 Toyota RAV4 Hybrid with rear hatch open for family weekend loading", "src": "https://asserts.gameseeks.com/icon/c18d633cfed92b866078f88dcb90046a646e8614afafa03d4569f14bbfc26a69.png", "title": "A loaded family-use scene tests the RAV4's real advantage: fitting ordinary passengers and gear without asking the driver to manage a larger SUV.", "width": 1400, "height": 933, "imageAlign": "center"}}, {"type": "paragraph", "content": [{"text": "A loaded family-use scene tests the RAV4's real advantage: fitting ordinary passengers and gear without asking the driver to manage a larger SUV.", "type": "text", "marks": [{"type": "italic"}]}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Comfort, Space, and Technology: Useful Before Exciting", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "For a value-focused family, the RAV4's upright cargo area and 60/40-split rear seat matter more than the new exterior's sharper angles. Up to 37.8 cubic feet behind the rear seat gives the owner room to keep passengers in place while carrying the week's routine. A small-business owner can use the same space for samples or compact equipment, although payload and cargo-securing needs should be verified on the specific vehicle.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The technology story follows the same logic. A 10.5-inch multimedia display is standard, wireless Apple CarPlay and Android Auto are included, and the 12.3-inch digital cluster is standard on every grade. The available 12.9-inch screen is easier to justify for someone who regularly uses navigation or split information views, but screen area alone is a weak reason to move into a $40,000-plus grade. Sit in both versions, pair a phone, and test the most common controls before paying for the larger interface.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Toyota Safety Sense 4.0 and standard blind-spot monitoring provide a strong baseline, yet they remain driver-assistance systems rather than substitutes for attention. New software is one of the largest generational changes, so buyers should check that updates, phone pairing, driver profiles, and any connected-service trials work as expected during delivery.", "type": "text"}]}, {"type": "image", "attrs": {"alt": "Driver perspective inside a 2026 Toyota RAV4 showing practical controls and passenger space", "src": "https://asserts.gameseeks.com/icon/4c17ab4613acf59d3624152016b11e32f8aabbde3dd6ccf78cec783269bd821e.png", "title": "The 2026 cabin adds larger digital interfaces, yet the value question is whether a buyer needs the available 12.9-inch screen rather than the standard 10.5-inch unit.", "width": 1400, "height": 933, "imageAlign": "center"}}, {"type": "paragraph", "content": [{"text": "The 2026 cabin adds larger digital interfaces, yet the value question is whether a buyer needs the available 12.9-inch screen rather than the standard 10.5-inch unit.", "type": "text", "marks": [{"type": "italic"}]}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Fuel Cost Estimate: Use the Exact Configuration", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Fuel economy is the RAV4's clearest commercial advantage, but a useful budget begins with the rating on the exact configuration. Toyota advertises up to 47 city/40 highway mpg, while equipment such as AWD, larger wheels, and all-terrain tires can lower the result. Real-world economy also moves with temperature, speed, trip length, loading, and driving behavior.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The estimate below uses 12,000 annual miles and $3.50 per gallon. Formula: annual miles divided by assumed mpg, multiplied by fuel price. These are planning scenarios, not official annual-cost forecasts.", "type": "text"}]}, {"type": "table", "content": [{"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Planning scenario", "type": "text", "marks": [{"type": "bold"}]}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Assumed mpg", "type": "text", "marks": [{"type": "bold"}]}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Annual gallons", "type": "text", "marks": [{"type": "bold"}]}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Estimated annual fuel cost", "type": "text", "marks": [{"type": "bold"}]}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Efficiency-oriented use", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "40 mpg", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "300", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$1,050", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Lower-efficiency configuration/use", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "36 mpg", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "333", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$1,167", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Difference", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "4 mpg", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "33", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$117 per year", "type": "text"}]}]}]}]}, {"type": "paragraph", "content": [{"text": "A four-mpg difference saves about $585 over five years under these assumptions. That is meaningful, but it does not recover a $5,000 trim-price jump. The disciplined buyer should evaluate purchase price and fuel use together rather than treating the highest mpg or richest equipment list as separate goals.", "type": "text"}]}, {"type": "image", "attrs": {"alt": "Fuel-cost comparison graphic for 2026 Toyota RAV4 ownership scenarios", "src": "https://asserts.gameseeks.com/icon/2f69fe2ac5e21ebc2cafe5938dc1e490b926c80468eb3f39416159087bb55f2a.png", "title": "Small efficiency differences compound over a year, but trim price can outweigh modest fuel savings if the upgrade does not improve the owner's actual routine.", "width": 1200, "height": 800, "imageAlign": "center"}}, {"type": "paragraph", "content": [{"text": "Small efficiency differences compound over a year, but trim price can outweigh modest fuel savings if the upgrade does not improve the owner's actual routine.", "type": "text", "marks": [{"type": "italic"}]}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Ownership Cost Estimate Without False Precision", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "A responsible ownership estimate adds costs that cannot be verified from a national article. Build a local worksheet using the actual selling price, taxes, financing terms, insurance quote, registration, expected annual mileage, fuel price, scheduled maintenance, tires, and parking. Then subtract only incentives that the buyer and VIN are confirmed to receive.", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Price first: compare out-the-door quotes for the same grade, drivetrain, packages, and dealer-installed accessories.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Fuel second: use the EPA rating for the exact configuration and test a higher and lower gasoline-price scenario.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Insurance third: quote the VIN or exact trim; cameras, sensors, wheels, location, driver history, and coverage limits affect premiums.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Maintenance and tires: separate scheduled service from unpredictable repair risk, and note that larger or specialized tires can cost more to replace.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Warranty: understand Toyota's basic, powertrain, hybrid-component, and hybrid-battery terms rather than assuming every part is covered for ten years.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Resale: treat past RAV4 demand as context, not a guaranteed future percentage for this new generation.", "type": "text"}]}]}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "RAV4 vs. CR-V Hybrid and Tucson Hybrid", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The Honda CR-V Hybrid is the closest practical counterargument. Honda lists the 2026 Sport Hybrid at $35,630, 204 total system horsepower, 40 combined mpg with front-wheel drive or 37 with AWD, and 36.3 cubic feet behind the second row. Its rear-seat packaging and calm road manners deserve an in-person comparison. The RAV4 counters with a lower hybrid entry price, higher stated system output, and a higher advertised maximum city/highway figure, although exact trims must be matched.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The 2026 Hyundai Tucson Hybrid adds another value lens. Hyundai lists a $32,450 starting MSRP on its current model page, 231 combined horsepower, and up to 38 combined mpg for the Blue SE AWD configuration, alongside a 10-year/100,000-mile powertrain limited warranty for the original owner under Hyundai's terms. It may appeal to a buyer who prioritizes cabin technology or warranty length, while the RAV4's highest-efficiency configurations and broad trim strategy may better suit mileage-focused shoppers.", "type": "text"}]}, {"type": "table", "content": [{"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Model", "type": "text", "marks": [{"type": "bold"}]}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Official starting point used", "type": "text", "marks": [{"type": "bold"}]}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Efficiency reference", "type": "text", "marks": [{"type": "bold"}]}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Best reason to choose", "type": "text", "marks": [{"type": "bold"}]}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "2026 Toyota RAV4 Hybrid", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$31,900 LE", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Up to 47 city/40 highway mpg", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Lowest hybrid entry here, strong output, broad configuration range", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "2026 Honda CR-V Sport Hybrid", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$35,630", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "40 combined FWD; 37 combined AWD", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Rear-seat and cargo usability with a composed family focus", "type": "text"}]}]}]}, {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "2026 Hyundai Tucson Hybrid", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "$32,450 on model page", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Up to 38 combined mpg for Blue SE AWD", "type": "text"}]}]}, {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"text": "Technology, power, and long original-owner powertrain coverage", "type": "text"}]}]}]}]}, {"type": "paragraph", "content": [{"text": "Prices exclude destination or freight and other charges; ratings and equipment vary by trim and drivetrain. The decisive test is not which specification wins a row, but which vehicle preserves its strengths in the configuration the buyer can actually purchase.", "type": "text"}]}, {"type": "image", "attrs": {"alt": "Neutral comparison of 2026 Toyota RAV4, Honda CR-V Hybrid, and Hyundai Tucson Hybrid in family use", "src": "https://asserts.gameseeks.com/icon/ebafb5f4552f8f7b9cf2cd0ae5359bac586881cf1cb90b3c552baf9e0a2113d7.png", "title": "RAV4, CR-V Hybrid, and Tucson Hybrid solve the same family-transport problem with different balances of efficiency, cargo flexibility, warranty coverage, and price.", "width": 1400, "height": 933, "imageAlign": "center"}}, {"type": "paragraph", "content": [{"text": "RAV4, CR-V Hybrid, and Tucson Hybrid solve the same family-transport problem with different balances of efficiency, cargo flexibility, warranty coverage, and price.", "type": "text", "marks": [{"type": "italic"}]}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Best Configuration for the Money", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "For the primary buyer in this plan, compare three builds: LE FWD as the efficiency and price baseline, SE in the preferred drivetrain as the affordable style upgrade, and XLE Premium as the comfort ceiling. The best configuration is the least expensive one that supplies the seats, liftgate operation, cold-weather equipment, parking aids, and drivetrain the household will use every week.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Choose AWD for recurring snow, steep access roads, or a configuration-dependent towing need—not because it sounds more complete. Choose XLE Premium when its daily comfort equipment solves a real friction point. Woodland makes sense for buyers who will use its outdoor-oriented hardware. XSE and Limited should be treated as preference purchases: their upgrades can be enjoyable, but they do not strengthen the core fuel-and-space equation enough to be default recommendations.", "type": "text"}]}, {"type": "image", "attrs": {"alt": "2026 Toyota RAV4 trim-choice graphic emphasizing LE, SE, and XLE Premium", "src": "https://asserts.gameseeks.com/icon/a129c07b7e66dfc0c79379e25460a5e510aa0225c39a7ae7294c5bf0e17bd70b.png", "title": "The rational RAV4 configuration sits in the middle of the ladder: enough comfort for daily use, without turning an efficiency purchase into a luxury-priced one.", "width": 1200, "height": 800, "imageAlign": "center"}}, {"type": "paragraph", "content": [{"text": "The rational RAV4 configuration sits in the middle of the ladder: enough comfort for daily use, without turning an efficiency purchase into a luxury-priced one.", "type": "text", "marks": [{"type": "italic"}]}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Buyer Fit", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Who Should Buy It", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Buy the 2026 RAV4 if the household needs one compact SUV to cover commuting, family cargo, and highway travel while keeping fuel use predictable. It also fits a small-business owner whose equipment stays within the RAV4's cargo and load limits and who values a widely available service network. Buyers willing to choose a lower or middle grade gain the clearest version of the vehicle's practical argument.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Who Should Skip It", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Skip it if steering engagement and acceleration character matter more than efficiency and packaging, or if the desired RAV4 build reaches a price where a larger, quieter, or more premium vehicle better fits the budget. Also pause if the purchase depends on maximum towing, unusually bulky commercial cargo, or a third row; those needs point beyond the compact two-row class.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Frequently Asked Questions", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Is every 2026 Toyota RAV4 a hybrid?", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Yes in the U.S. lineup announced by Toyota. Buyers choose between the regular hybrid and plug-in hybrid rather than a gas-only version.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Which 2026 RAV4 trim offers the best value?", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "LE is the cleanest price-and-efficiency baseline. SE and XLE Premium are the sensible next comparisons when style or daily comfort matters. The best answer depends on drivetrain, packages, and the out-the-door quote.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "What fuel economy does the 2026 RAV4 get?", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Toyota advertises up to 47 city/40 highway mpg. The exact EPA rating varies by grade, drivetrain, wheels, and tires, so use the window sticker for the vehicle being considered.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "How much cargo space does it have?", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Toyota lists up to 37.8 cubic feet behind the rear seat. Bring the stroller, sample case, or bulky item that matters to the household and test the opening and floor shape.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Is the 2026 RAV4 good for city driving?", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Its compact-SUV dimensions, available front-wheel drive, hybrid operation, and high city-economy claim suit urban commuting. Buyers should still test visibility, parking-camera coverage, and low-speed control placement.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Should I choose front-wheel drive or all-wheel drive?", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "FWD is the efficiency and price choice. AWD is more defensible for recurring slippery conditions, steep routes, or specific towing requirements. Tires remain critical in winter conditions.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "How does it compare with the Honda CR-V Hybrid?", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The RAV4 offers a lower announced hybrid starting price and higher system output. The CR-V Hybrid deserves consideration for passenger packaging and its composed family-oriented experience. Compare equivalent drivetrains and equipment.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Can the 2026 RAV4 tow?", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Toyota lists up to 3,500 pounds, but capacity is configuration-dependent. Confirm the vehicle's rating, hitch equipment, trailer brakes, payload, tongue weight, and owner's-manual limits.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "What should a buyer verify before signing?", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Verify the VIN-specific window sticker, EPA rating, installed packages, processing and dealer fees, financing terms, insurance quote, warranty documents, software operation, and any open recalls or service campaigns.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Final Verdict", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The 2026 RAV4's reputation survives contact with reality because Toyota has modernized the parts families use most: the hybrid system, safety suite, screens, and flexible two-row packaging. It remains a comfort-and-efficiency tool rather than an excitement purchase, and that is a coherent identity rather than a flaw.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The compromise appears when the buyer pays premium-trim money for features that do not improve the weekly routine. Start with LE, test SE and XLE Premium against a written needs list, and move higher only for equipment that will be used consistently. Compare 2026 RAV4 trims, then obtain equivalent out-the-door quotes for the CR-V Hybrid and Tucson Hybrid before deciding.", "type": "text"}]}, {"type": "articleButton", "attrs": {"id": "RAV4_2026_20260812-cta", "text": "Compare 2026 RAV4 trims", "style": "button", "title": "Compare the current 2026 Toyota RAV4 grade lineup"}}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "References", "type": "text"}]}, {"type": "orderedList", "attrs": {"start": 1}, "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Toyota Motor North America: ", "type": "text"}, {"text": "All-New 2026 Toyota RAV4 Takes Center Stage in ‘What’s Your RAV4?’ Campaign", "type": "text", "marks": [{"type": "link", "attrs": {"href": "https://pressroom.toyota.com/all-new-2026-toyota-rav4-takes-center-stage-in-whats-your-rav4-campaign/", "target": "_blank"}}]}, {"text": ". Accessed August 12, 2026.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Toyota: ", "type": "text"}, {"text": "2026 Toyota RAV4 Overview", "type": "text", "marks": [{"type": "link", "attrs": {"href": "https://www.toyota.com/rav4/", "target": "_blank"}}]}, {"text": ". Accessed August 12, 2026.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Toyota: ", "type": "text"}, {"text": "2026 Toyota RAV4 Full Specifications", "type": "text", "marks": [{"type": "link", "attrs": {"href": "https://www.toyota.com/rav4/features/", "target": "_blank"}}]}, {"text": ". Accessed August 12, 2026.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Toyota: ", "type": "text"}, {"text": "2026 RAV4 Brochure and Warranty Information", "type": "text", "marks": [{"type": "link", "attrs": {"href": "https://www.toyota.com/content/dam/toyota/brochures/pdf/2026/2026_rav4_brochure_20260612_142557.pdf", "target": "_blank"}}]}, {"text": ". Accessed August 12, 2026.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "American Honda Motor Co.: ", "type": "text"}, {"text": "2026 CR-V Specifications and Features", "type": "text", "marks": [{"type": "link", "attrs": {"href": "https://automobiles.honda.com/cr-v/specs-features-trim-comparison", "target": "_blank"}}]}, {"text": ". Accessed August 12, 2026.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Hyundai Motor America: ", "type": "text"}, {"text": "2026 Tucson Hybrid", "type": "text", "marks": [{"type": "link", "attrs": {"href": "https://www.hyundaiusa.com/us/en/vehicles/tucson-hybrid", "target": "_blank"}}]}, {"text": ". Accessed August 12, 2026.", "type": "text"}]}]}]}]}

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
