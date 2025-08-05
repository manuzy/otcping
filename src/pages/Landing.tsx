import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WalletAuthButton from "@/components/auth/WalletAuthButton";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useNavigate } from "react-router-dom";
import { Shield, MessageSquare, TrendingUp, Users, CheckCircle, ArrowRight, Zap, Lock, Globe, Star, DollarSign } from "lucide-react";
import Header from "@/components/navigation/Header";
import Footer from "@/components/layout/Footer";

const Landing = () => {
  const { isAuthenticated } = useWalletAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: "Secure Wallet Authentication",
      description: "Connect safely with your crypto wallet using industry-standard security protocols"
    },
    {
      icon: MessageSquare,
      title: "Direct P2P Communication",
      description: "Chat directly with trading counterparts in real-time secure messaging"
    },
    {
      icon: TrendingUp,
      title: "OTC Trading Made Simple",
      description: "Create and manage over-the-counter trades with transparent pricing"
    },
    {
      icon: Users,
      title: "Trusted Community",
      description: "Trade with verified users and build your reputation in the community"
    }
  ];

  const benefits = [
    "No intermediary fees",
    "Direct peer-to-peer trading", 
    "Secure wallet integration",
    "Real-time communication",
    "Transparent pricing",
    "Community-driven trust"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,160,23,0.1),transparent_60%)]" />
        <div className="relative container mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-6xl mx-auto text-center">
            <Badge variant="secondary" className="mb-8 px-6 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
              <Zap className="w-4 h-4 mr-2" />
              Limitless Trading Platform
            </Badge>
            
            <h1 className="text-5xl lg:text-7xl font-bold mb-8 leading-tight text-foreground tracking-tight">
              Any Asset. Any Strategy.
              <br />
              <span className="text-primary">Launch Your AMC</span>
              <br />
              in Days.
            </h1>
            
            <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              The secure platform for over-the-counter cryptocurrency trading with direct peer-to-peer communication and unlimited possibilities.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              {isAuthenticated ? (
                <Button 
                  variant="hero" 
                  size="lg" 
                  onClick={() => navigate('/app')} 
                  className="text-xl px-12 py-4 h-14"
                >
                  Launch Platform
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              ) : (
                <WalletAuthButton />
              )}
              
              <Button 
                variant="outline" 
                size="lg" 
                className="text-xl px-12 py-4 h-14"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Discover More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">$2.5B+</div>
                <div className="text-muted-foreground">Volume Traded</div>
              </div>
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">10K+</div>
                <div className="text-muted-foreground">Active Traders</div>
              </div>
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">99.9%</div>
                <div className="text-muted-foreground">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Why Choose OTCping?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Experience the future of peer-to-peer cryptocurrency trading with our secure and intuitive platform built for professionals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border-0 bg-card shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-4">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started with OTCping in three simple steps
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center group">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <Lock className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-foreground">1. Connect Wallet</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Securely connect your crypto wallet to authenticate and start trading with complete peace of mind
                </p>
              </div>

              <div className="text-center group">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-foreground">2. Create or Find Trades</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Browse existing trades or create your own with custom terms, pricing, and settlement preferences
                </p>
              </div>

              <div className="text-center group">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-foreground">3. Trade & Communicate</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Chat directly with counterparts and complete secure peer-to-peer transactions seamlessly
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold mb-8 text-foreground">
                  Trade with Complete Confidence
                </h2>
                <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
                  OTCping provides a secure environment for large-scale cryptocurrency trades without the limitations of traditional exchanges. Built by traders, for traders.
                </p>
                
                <div className="space-y-6">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                      <span className="text-lg text-foreground font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="p-12 bg-card shadow-xl border-0">
                <div className="text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
                    <Globe className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-3xl font-bold mb-6 text-foreground">Join the Elite Community</h3>
                  <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                    Connect with institutional traders and high-net-worth individuals in a secure, professional environment designed for serious trading.
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 mb-8">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                    <span className="ml-2 text-muted-foreground">4.9/5 from 2,500+ reviews</span>
                  </div>

                  {!isAuthenticated && <WalletAuthButton />}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl lg:text-5xl font-bold mb-8 text-background">
              Ready to Revolutionize Your Trading?
            </h2>
            <p className="text-xl text-background/80 mb-12 leading-relaxed">
              Join thousands of institutional traders who trust OTCping for secure, professional peer-to-peer cryptocurrency trading with unlimited potential.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              {isAuthenticated ? (
                <Button 
                  variant="hero" 
                  size="lg" 
                  onClick={() => navigate('/app')} 
                  className="text-xl px-12 py-4 h-14 bg-primary hover:bg-primary/90"
                >
                  Launch Platform
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              ) : (
                <WalletAuthButton />
              )}
              
              <Button 
                variant="outline" 
                size="lg" 
                className="text-xl px-12 py-4 h-14 border-background/20 text-background hover:bg-background/10"
              >
                <DollarSign className="mr-3 h-6 w-6" />
                View Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;