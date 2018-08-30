import * as React from 'react'
import Button from '../../../components/Button'

const s = require('./index.css')
const style = require('../../../styles/ynos.css')

export interface SendCurrencyFooterProps {
  addressError: string
  balanceError: string
  cancel: () => void
  confirm: () => void
  disableSend: boolean
  isConfirming: boolean
  onSendTransaction: () => Promise<void>
  walletAddress: string|null
}

export const SendCurrencyFooter = ({
  addressError,
  balanceError,
  cancel,
  confirm,
  disableSend,
  isConfirming,
  onSendTransaction,
  walletAddress
}: SendCurrencyFooterProps) => (
  isConfirming
    ? (
      <div className={s.footer}>
        <Button
          type="tertiary"
          content="Cancel"
          onClick={cancel}
        />
        <Button
          content="Confirm"
          type="dark"
          onClick={onSendTransaction}
        />
      </div>
    )
    : (
      <div className={s.footer}>
        <Button
          content={<div className={style.loginButton} />}
          onClick={confirm}
          disabled={!!addressError || !!balanceError || disableSend || !walletAddress}
          isSubmit
        />
      </div>
    )
)
