import * as React from 'react'
import Button from '../../../components/Button'

const s = require('./index.css')

export interface AutoFillButtonsProps {
  autoFill: (decimalPercent: number) => void
  isConfirming: boolean
}

export const AutoFillButtons = ({autoFill, isConfirming}: AutoFillButtonsProps) => (
  <div className={s.autoFillButtons}>
    <Button
      content="25%"
      onClick={() => autoFill(.25)}
      className={s.autoFillButton25}
      disabled={isConfirming}
    />
    <Button
      content="50%"
      onClick={() => autoFill(.50)}
      className={s.autoFillButton50}
    />
    <Button
      content="75%"
      onClick={() => autoFill(.75)}
      className={s.autoFillButton75}
    />
    <Button
      content="MAX"
      onClick={() => autoFill(1)}
      className={s.autoFillButtonMax}
    />
  </div>
)