import * as React from 'react'
import TextBox from '../../components/TextBox/index'
import Input from '../../components/Input/index'
import Button from '../../components/Button/index'

const style = require('../../styles/ynos.css')

export interface SeedWordsProps {
  message?: string
  onSubmit: (seeds: string[]) => void
  goBack: () => void
  isAndroid: boolean
}

export interface SeedWordsState {
  seeds: string[]
}

const alpha = /^[a-z]*$/i

export default class SeedWords extends React.Component<SeedWordsProps, SeedWordsState> {
  state = {
    seeds: []
  } as SeedWordsState

  render() {
    return (
      <div className={style.content}>
        <div className={style.funnelTitle}>
          Restore Backup Seed
        </div>
        <TextBox className={style.passwordTextBox}>
          {this.props.message || 'Enter your SpankCard backup words. Use tab to jump to the next field.'}
        </TextBox>
        {this.renderFields()}
        <div className={`${style.funnelFooter} ${this.props.isAndroid ? style.androidFooter : ''}`}>
          <Button
            type="secondary"
            content="Go Back"
            onClick={this.props.goBack}
            isInverse
          />
          <Button
            content={<div className={style.restoreButton} />}
            onClick={this.onSubmit}
            isInverse
          />
        </div>
      </div>
    )
  }

  setSeed (i: number) {
    return {
      value: this.state.seeds[i] || '',
      onChange: (e: KeyboardEvent) => this.updateSeed(i, e)
    }
  }

  updateSeed (i: number, e: any) {
    const value = e.target.value.toLowerCase()

    if (!value.match(alpha)) {
      return
    }

    const seeds = [].concat(this.state.seeds as any) as string[]
    seeds[i] = value

    this.setState({
      seeds
    })
  }

  onPaste = (idx: number) => (e: any) => {
    const clipboardData = e.clipboardData || e.originalEvent.clipboardData || (window as any).clipboardData
    const data = clipboardData.getData('text')
    const splits = data.split(/\s+/).map((s: string) => s.toLowerCase())
    const seeds = this.state.seeds.concat()

    splits.forEach((bit: string, i: number) => {
      seeds[idx + i] = bit.replace(/[^a-z]/gi, '')
    })

    this.setState({
      seeds
    })

    e.preventDefault()

    return false
  }

  onSubmit = () => {
    this.props.onSubmit(this.state.seeds)
  }

  renderFields () {
    const out = []

    for (let i = 0; i < 12; i++) {
      out.push(
        <li key={i} className={style.backupFieldWrapper}>
          <Input
            autoFocus={i === 0}
            className={style.backupField}
            {...this.setSeed(i)}
            onPaste={this.onPaste(i)}
            inverse
          />
        </li>
      )
    }

    return (
      <ol className={style.backupFields}>
        {out}
      </ol>
    )
  }
}
