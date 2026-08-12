import type { RenderIssue, ValidationResult } from '../../types.js'

type UnknownRecord = Record<string, unknown>

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'codeBlock',
  'horizontalRule',
  'image',
  'articleButton',
  'table',
])

const TEXT_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify'])
const IMAGE_ALIGNMENTS = new Set(['left', 'center', 'right'])
const SIMPLE_MARKS = new Set(['bold', 'italic', 'strike', 'underline', 'code'])

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function childPath(path: string, key: string | number): string {
  return `${path}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`
}

function nestedPath(path: string, ...keys: Array<string | number>): string {
  let current = path
  for (const key of keys) current = childPath(current, key)
  return current
}

class ProtocolV1Validator {
  readonly issues: RenderIssue[] = []

  validate(document: unknown): ValidationResult {
    if (!isRecord(document)) {
      this.add('INVALID_ROOT', '', 'The document must be an object.')
      return this.result()
    }

    this.checkProperties(document, '', ['type', 'content'], ['type', 'content'])

    if (document.type !== 'doc') {
      this.add('INVALID_ROOT', '/type', 'The root node type must be "doc".')
    }

    const content = this.requireArray(document.content, '/content')
    content?.forEach((node, index) => this.validateBlock(node, childPath('/content', index)))

    return this.result()
  }

  private result(): ValidationResult {
    return {
      valid: this.issues.length === 0,
      issues: this.issues,
    }
  }

  private add(
    code: RenderIssue['code'],
    path: string,
    message: string,
    nodeType?: string,
  ): void {
    this.issues.push({ code, path, message, ...(nodeType ? { nodeType } : {}) })
  }

  private checkProperties(
    value: UnknownRecord,
    path: string,
    allowed: readonly string[],
    required: readonly string[] = [],
    nodeType?: string,
  ): void {
    const allowedSet = new Set(allowed)

    for (const key of Object.keys(value)) {
      if (!allowedSet.has(key)) {
        this.add(
          'UNKNOWN_PROPERTY',
          childPath(path, key),
          `Property "${key}" is not allowed.`,
          nodeType,
        )
      }
    }

    for (const key of required) {
      if (!(key in value)) {
        this.add(
          'MISSING_PROPERTY',
          childPath(path, key),
          `Required property "${key}" is missing.`,
          nodeType,
        )
      }
    }
  }

  private requireArray(value: unknown, path: string, nodeType?: string): unknown[] | null {
    if (!Array.isArray(value)) {
      this.add('INVALID_TYPE', path, 'Expected an array.', nodeType)
      return null
    }
    return value
  }

  private optionalArray(value: unknown, path: string, nodeType?: string): unknown[] | null {
    if (value === undefined) return []
    return this.requireArray(value, path, nodeType)
  }

  private requireNonEmptyArray(
    value: unknown,
    path: string,
    nodeType: string,
  ): unknown[] | null {
    const content = this.requireArray(value, path, nodeType)
    if (content && content.length === 0) {
      this.add(
        'INVALID_CONTENT',
        path,
        `Node "${nodeType}" must contain at least one child.`,
        nodeType,
      )
    }
    return content
  }

  private requireRecord(value: unknown, path: string, nodeType?: string): UnknownRecord | null {
    if (!isRecord(value)) {
      this.add('INVALID_TYPE', path, 'Expected an object.', nodeType)
      return null
    }
    return value
  }

  private optionalRecord(value: unknown, path: string, nodeType?: string): UnknownRecord | null {
    if (value === undefined) return {}
    return this.requireRecord(value, path, nodeType)
  }

  private requireString(
    value: unknown,
    path: string,
    nodeType?: string,
    options: { allowEmpty?: boolean; maxLength?: number } = {},
  ): value is string {
    if (typeof value !== 'string') {
      this.add('INVALID_TYPE', path, 'Expected a string.', nodeType)
      return false
    }
    if (!options.allowEmpty && value.length === 0) {
      this.add('INVALID_VALUE', path, 'The string must not be empty.', nodeType)
      return false
    }
    if (options.maxLength !== undefined && value.length > options.maxLength) {
      this.add(
        'INVALID_VALUE',
        path,
        `The string must contain at most ${options.maxLength} characters.`,
        nodeType,
      )
      return false
    }
    return true
  }

  private optionalString(
    value: unknown,
    path: string,
    nodeType: string,
    options: { allowEmpty?: boolean; maxLength?: number } = {},
  ): void {
    if (value !== undefined) this.requireString(value, path, nodeType, options)
  }

  private requireInteger(
    value: unknown,
    path: string,
    nodeType: string,
    minimum?: number,
    maximum?: number,
  ): value is number {
    if (!Number.isInteger(value)) {
      this.add('INVALID_TYPE', path, 'Expected an integer.', nodeType)
      return false
    }
    const numberValue = value as number
    if (minimum !== undefined && numberValue < minimum) {
      this.add('INVALID_VALUE', path, `Value must be at least ${minimum}.`, nodeType)
      return false
    }
    if (maximum !== undefined && numberValue > maximum) {
      this.add('INVALID_VALUE', path, `Value must be at most ${maximum}.`, nodeType)
      return false
    }
    return true
  }

  private validateBlock(value: unknown, path: string): void {
    if (!isRecord(value)) {
      this.add('INVALID_TYPE', path, 'A block node must be an object.')
      return
    }

    const type = value.type
    if (typeof type !== 'string') {
      this.add('MISSING_PROPERTY', childPath(path, 'type'), 'A block node requires a type.')
      return
    }
    if (!BLOCK_TYPES.has(type)) {
      this.add('UNKNOWN_NODE', childPath(path, 'type'), `Unknown block node "${type}".`, type)
      return
    }

    switch (type) {
      case 'paragraph':
        this.validateParagraph(value, path)
        break
      case 'heading':
        this.validateHeading(value, path)
        break
      case 'blockquote':
        this.validateBlockquote(value, path)
        break
      case 'bulletList':
        this.validateBulletList(value, path)
        break
      case 'orderedList':
        this.validateOrderedList(value, path)
        break
      case 'codeBlock':
        this.validateCodeBlock(value, path)
        break
      case 'horizontalRule':
        this.checkProperties(value, path, ['type'], ['type'], type)
        break
      case 'image':
        this.validateImage(value, path)
        break
      case 'articleButton':
        this.validateArticleButton(value, path)
        break
      case 'table':
        this.validateTable(value, path)
        break
    }
  }

  private validateParagraph(node: UnknownRecord, path: string): void {
    const type = 'paragraph'
    this.checkProperties(node, path, ['type', 'attrs', 'content'], ['type'], type)
    this.validateTextAlignAttrs(node.attrs, childPath(path, 'attrs'), type, false)
    this.validateInlineContent(node.content, childPath(path, 'content'), type)
  }

  private validateHeading(node: UnknownRecord, path: string): void {
    const type = 'heading'
    this.checkProperties(node, path, ['type', 'attrs', 'content'], ['type', 'attrs'], type)
    const attrs = this.requireRecord(node.attrs, childPath(path, 'attrs'), type)
    if (attrs) {
      this.checkProperties(attrs, childPath(path, 'attrs'), ['level', 'textAlign'], ['level'], type)
      this.requireInteger(attrs.level, nestedPath(path, 'attrs', 'level'), type, 1, 6)
      this.validateTextAlign(attrs.textAlign, nestedPath(path, 'attrs', 'textAlign'), type)
    }
    this.validateInlineContent(node.content, childPath(path, 'content'), type)
  }

  private validateTextAlignAttrs(
    value: unknown,
    path: string,
    nodeType: string,
    required: boolean,
  ): void {
    const attrs = required
      ? this.requireRecord(value, path, nodeType)
      : this.optionalRecord(value, path, nodeType)
    if (!attrs) return
    this.checkProperties(attrs, path, ['textAlign'], [], nodeType)
    this.validateTextAlign(attrs.textAlign, childPath(path, 'textAlign'), nodeType)
  }

  private validateTextAlign(value: unknown, path: string, nodeType: string): void {
    if (value === undefined) return
    if (typeof value !== 'string') {
      this.add('INVALID_TYPE', path, 'Text alignment must be a string.', nodeType)
    } else if (!TEXT_ALIGNMENTS.has(value)) {
      this.add('INVALID_VALUE', path, `Unsupported text alignment "${value}".`, nodeType)
    }
  }

  private validateInlineContent(value: unknown, path: string, nodeType: string): void {
    const content = this.optionalArray(value, path, nodeType)
    content?.forEach((child, index) => this.validateText(child, childPath(path, index), true))
  }

  private validateText(value: unknown, path: string, allowMarks: boolean): void {
    if (!isRecord(value)) {
      this.add('INVALID_TYPE', path, 'A text node must be an object.', 'text')
      return
    }
    const allowed = allowMarks ? ['type', 'text', 'marks'] : ['type', 'text']
    this.checkProperties(value, path, allowed, ['type', 'text'], 'text')
    if (value.type !== 'text') {
      this.add('INVALID_CONTENT', childPath(path, 'type'), 'Expected a text node.', 'text')
    }
    this.requireString(value.text, childPath(path, 'text'), 'text')

    if (allowMarks && value.marks !== undefined) {
      const marks = this.requireArray(value.marks, childPath(path, 'marks'), 'text')
      marks?.forEach((mark, index) => this.validateMark(mark, nestedPath(path, 'marks', index)))
    }
  }

  private validateMark(value: unknown, path: string): void {
    if (!isRecord(value)) {
      this.add('INVALID_TYPE', path, 'A mark must be an object.')
      return
    }
    if (typeof value.type !== 'string') {
      this.add('MISSING_PROPERTY', childPath(path, 'type'), 'A mark requires a type.')
      return
    }
    if (SIMPLE_MARKS.has(value.type)) {
      this.checkProperties(value, path, ['type'], ['type'], value.type)
      return
    }
    if (value.type !== 'link') {
      this.add('UNKNOWN_MARK', childPath(path, 'type'), `Unknown mark "${value.type}".`, value.type)
      return
    }

    this.checkProperties(value, path, ['type', 'attrs'], ['type', 'attrs'], 'link')
    const attrs = this.requireRecord(value.attrs, childPath(path, 'attrs'), 'link')
    if (!attrs) return
    this.checkProperties(attrs, childPath(path, 'attrs'), ['href', 'target'], ['href'], 'link')
    this.requireString(attrs.href, nestedPath(path, 'attrs', 'href'), 'link')
    if (attrs.target !== undefined && attrs.target !== '_blank' && attrs.target !== '_self') {
      this.add(
        'INVALID_VALUE',
        nestedPath(path, 'attrs', 'target'),
        'Link target must be "_blank" or "_self".',
        'link',
      )
    }
  }

  private validateBlockquote(node: UnknownRecord, path: string): void {
    const type = 'blockquote'
    this.checkProperties(node, path, ['type', 'content'], ['type', 'content'], type)
    const content = this.requireNonEmptyArray(node.content, childPath(path, 'content'), type)
    content?.forEach((child, index) => this.validateBlock(child, nestedPath(path, 'content', index)))
  }

  private validateBulletList(node: UnknownRecord, path: string): void {
    const type = 'bulletList'
    this.checkProperties(node, path, ['type', 'content'], ['type', 'content'], type)
    const content = this.requireNonEmptyArray(node.content, childPath(path, 'content'), type)
    content?.forEach((child, index) => this.validateListItem(child, nestedPath(path, 'content', index)))
  }

  private validateOrderedList(node: UnknownRecord, path: string): void {
    const type = 'orderedList'
    this.checkProperties(node, path, ['type', 'attrs', 'content'], ['type', 'content'], type)
    const attrs = this.optionalRecord(node.attrs, childPath(path, 'attrs'), type)
    if (attrs) {
      this.checkProperties(attrs, childPath(path, 'attrs'), ['start'], [], type)
      if (attrs.start !== undefined) {
        this.requireInteger(attrs.start, nestedPath(path, 'attrs', 'start'), type, 1)
      }
    }
    const content = this.requireNonEmptyArray(node.content, childPath(path, 'content'), type)
    content?.forEach((child, index) => this.validateListItem(child, nestedPath(path, 'content', index)))
  }

  private validateListItem(value: unknown, path: string): void {
    const type = 'listItem'
    const node = this.requireRecord(value, path, type)
    if (!node) return
    this.checkProperties(node, path, ['type', 'content'], ['type', 'content'], type)
    if (node.type !== type) {
      this.add('INVALID_CONTENT', childPath(path, 'type'), 'Expected a listItem node.', type)
    }
    const content = this.requireNonEmptyArray(node.content, childPath(path, 'content'), type)
    content?.forEach((child, index) => this.validateBlock(child, nestedPath(path, 'content', index)))
  }

  private validateCodeBlock(node: UnknownRecord, path: string): void {
    const type = 'codeBlock'
    this.checkProperties(node, path, ['type', 'attrs', 'content'], ['type'], type)
    const attrs = this.optionalRecord(node.attrs, childPath(path, 'attrs'), type)
    if (attrs) {
      this.checkProperties(attrs, childPath(path, 'attrs'), ['language'], [], type)
      this.optionalString(attrs.language, nestedPath(path, 'attrs', 'language'), type, { maxLength: 32 })
    }
    const content = this.optionalArray(node.content, childPath(path, 'content'), type)
    if (!content) return
    if (content.length > 1) {
      this.add(
        'INVALID_CONTENT',
        childPath(path, 'content'),
        'A codeBlock may contain at most one text node.',
        type,
      )
    }
    content.forEach((child, index) =>
      this.validateText(child, nestedPath(path, 'content', index), false),
    )
  }

  private validateImage(node: UnknownRecord, path: string): void {
    const type = 'image'
    this.checkProperties(node, path, ['type', 'attrs'], ['type', 'attrs'], type)
    const attrs = this.requireRecord(node.attrs, childPath(path, 'attrs'), type)
    if (!attrs) return
    this.checkProperties(
      attrs,
      childPath(path, 'attrs'),
      ['src', 'alt', 'title', 'width', 'height', 'imageAlign'],
      ['src'],
      type,
    )
    this.requireString(attrs.src, nestedPath(path, 'attrs', 'src'), type)
    this.optionalString(attrs.alt, nestedPath(path, 'attrs', 'alt'), type, { allowEmpty: true })
    this.optionalString(attrs.title, nestedPath(path, 'attrs', 'title'), type, { allowEmpty: true })
    if (attrs.width !== undefined) {
      this.requireInteger(attrs.width, nestedPath(path, 'attrs', 'width'), type, 1, 10_000)
    }
    if (attrs.height !== undefined) {
      this.requireInteger(attrs.height, nestedPath(path, 'attrs', 'height'), type, 1, 10_000)
    }
    if (attrs.imageAlign !== undefined) {
      if (typeof attrs.imageAlign !== 'string') {
        this.add('INVALID_TYPE', nestedPath(path, 'attrs', 'imageAlign'), 'Image alignment must be a string.', type)
      } else if (!IMAGE_ALIGNMENTS.has(attrs.imageAlign)) {
        this.add(
          'INVALID_VALUE',
          nestedPath(path, 'attrs', 'imageAlign'),
          `Unsupported image alignment "${attrs.imageAlign}".`,
          type,
        )
      }
    }
  }

  private validateArticleButton(node: UnknownRecord, path: string): void {
    const type = 'articleButton'
    this.checkProperties(node, path, ['type', 'attrs'], ['type', 'attrs'], type)
    const attrs = this.requireRecord(node.attrs, childPath(path, 'attrs'), type)
    if (!attrs) return
    this.checkProperties(
      attrs,
      childPath(path, 'attrs'),
      ['id', 'title', 'text', 'style', 'href'],
      ['text', 'style'],
      type,
    )
    if (attrs.style === 'text' || attrs.style === 'button') {
      if (!('id' in attrs)) {
        this.add(
          'MISSING_PROPERTY',
          nestedPath(path, 'attrs', 'id'),
          'Required property "id" is missing for an articleButton with text or button style.',
          type,
        )
      } else {
        this.requireString(attrs.id, nestedPath(path, 'attrs', 'id'), type)
      }
    } else {
      this.optionalString(attrs.id, nestedPath(path, 'attrs', 'id'), type)
    }
    this.optionalString(attrs.title, nestedPath(path, 'attrs', 'title'), type)
    this.requireString(attrs.text, nestedPath(path, 'attrs', 'text'), type)
    this.optionalString(attrs.href, nestedPath(path, 'attrs', 'href'), type)
    if (attrs.style !== 'text' && attrs.style !== 'button' && attrs.style !== 'link') {
      this.add(
        'INVALID_VALUE',
        nestedPath(path, 'attrs', 'style'),
        'Article button style must be "text", "button", or "link".',
        type,
      )
    }
    if (attrs.href !== undefined && attrs.style !== 'link') {
      this.add(
        'INVALID_VALUE',
        nestedPath(path, 'attrs', 'href'),
        'Article button href may only be present when style is "link".',
        type,
      )
    }
  }

  private validateTable(node: UnknownRecord, path: string): void {
    const type = 'table'
    this.checkProperties(node, path, ['type', 'content'], ['type', 'content'], type)
    const rows = this.requireNonEmptyArray(node.content, childPath(path, 'content'), type)
    if (!rows) return

    let expectedColumns: number | null = null
    rows.forEach((row, index) => {
      const rowPath = nestedPath(path, 'content', index)
      const columnCount = this.validateTableRow(row, rowPath)
      if (columnCount === null) return
      if (expectedColumns === null) {
        expectedColumns = columnCount
      } else if (columnCount !== expectedColumns) {
        this.add(
          'TABLE_COLUMN_MISMATCH',
          childPath(rowPath, 'content'),
          `Expected ${expectedColumns} table cells but received ${columnCount}.`,
          'tableRow',
        )
      }
    })
  }

  private validateTableRow(value: unknown, path: string): number | null {
    const type = 'tableRow'
    const node = this.requireRecord(value, path, type)
    if (!node) return null
    this.checkProperties(node, path, ['type', 'content'], ['type', 'content'], type)
    if (node.type !== type) {
      this.add('INVALID_CONTENT', childPath(path, 'type'), 'Expected a tableRow node.', type)
    }
    const cells = this.requireNonEmptyArray(node.content, childPath(path, 'content'), type)
    cells?.forEach((cell, index) => this.validateTableCell(cell, nestedPath(path, 'content', index)))
    return cells?.length ?? null
  }

  private validateTableCell(value: unknown, path: string): void {
    const type = 'tableCell'
    const node = this.requireRecord(value, path, type)
    if (!node) return
    this.checkProperties(node, path, ['type', 'content'], ['type', 'content'], type)
    if (node.type !== type) {
      this.add('INVALID_CONTENT', childPath(path, 'type'), 'Expected a tableCell node.', type)
    }
    const content = this.requireNonEmptyArray(node.content, childPath(path, 'content'), type)
    content?.forEach((child, index) => this.validateBlock(child, nestedPath(path, 'content', index)))
  }
}

export function validateDocumentV1(document: unknown): ValidationResult {
  return new ProtocolV1Validator().validate(document)
}

