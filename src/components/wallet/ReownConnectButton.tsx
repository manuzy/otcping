export default function ReownConnectButton() {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
      <p className="text-muted-foreground text-center">
        Connect your wallet to start trading securely on the OTC platform
      </p>
      <appkit-button />
    </div>
  )
}