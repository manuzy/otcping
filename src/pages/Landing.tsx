import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WalletAuthButton from "@/components/auth/WalletAuthButton";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useNavigate } from "react-router-dom";
import { Shield, MessageSquare, TrendingUp, Users, CheckCircle, ArrowRight, Zap, Lock, Globe } from "lucide-react";
const Landing = () => {
  const {
    isAuthenticated
  } = useWalletAuth();
  const navigate = useNavigate();
  const features = [{
    icon: Shield,
    title: "Secure Wallet Authentication",
    description: "Connect safely with your crypto wallet using industry-standard security protocols"
  }, {
    icon: MessageSquare,
    title: "Direct P2P Communication",
    description: "Chat directly with trading counterparts in real-time secure messaging"
  }, {
    icon: TrendingUp,
    title: "OTC Trading Made Simple",
    description: "Create and manage over-the-counter trades with transparent pricing"
  }, {
    icon: Users,
    title: "Trusted Community",
    description: "Trade with verified users and build your reputation in the community"
  }];
  const benefits = ["No intermediary fees", "Direct peer-to-peer trading", "Secure wallet integration", "Real-time communication", "Transparent pricing", "Community-driven trust"];
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-4xl mx-auto text-center py-[10px]">
            <Badge variant="secondary" className="mb-6">
              <Zap className="w-3 h-3 mr-1" />
              Secure P2P Trading Platform
            </Badge>
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Welcome to OTCping
            </h1>
            
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The secure platform for over-the-counter cryptocurrency trading with direct peer-to-peer communication
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? <Button size="lg" onClick={() => navigate('/app')} className="text-lg px-8 py-3">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button> : <WalletAuthButton />}
              
              <Button variant="outline" size="lg" className="text-lg px-8 py-3" onClick={() => document.getElementById('features')?.scrollIntoView({
              behavior: 'smooth'
            })}>
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 my-[20px]">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Why Choose OTCping?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of peer-to-peer cryptocurrency trading with our secure and intuitive platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => <Card key={index} className="text-center border-0 bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Get started with OTCping in three simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">1. Connect Wallet</h3>
                <p className="text-muted-foreground">
                  Securely connect your crypto wallet to authenticate and start trading
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">2. Create or Find Trades</h3>
                <p className="text-muted-foreground">
                  Browse existing trades or create your own with custom terms and pricing
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">3. Trade & Communicate</h3>
                <p className="text-muted-foreground">
                  Chat directly with counterparts and complete secure P2P transactions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                  Trade with Confidence
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  OTCping provides a secure environment for large-scale cryptocurrency trades without the limitations of traditional exchanges.
                </p>
                
                <div className="space-y-4">
                  {benefits.map((benefit, index) => <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-lg">{benefit}</span>
                    </div>)}
                </div>
              </div>

              <Card className="p-8 bg-background/50 backdrop-blur-sm border-0">
                <div className="text-center">
                  <Globe className="w-16 h-16 text-primary mx-auto mb-6" />
                  <h3 className="text-2xl font-bold mb-4">Join the Community</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect with traders worldwide and build lasting business relationships in a secure environment.
                  </p>
                  
                  {!isAuthenticated && <WalletAuthButton />}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to Start Trading?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of traders who trust OTCping for secure peer-to-peer cryptocurrency trading.
            </p>
            
            {isAuthenticated ? <Button size="lg" onClick={() => navigate('/app')} className="text-lg px-8 py-3">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button> : <WalletAuthButton />}
          </div>
        </div>
      </section>
    </div>;
};
export default Landing;