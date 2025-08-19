import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { BetaApplicationModal } from './BetaApplicationModal';

export function BetaAccessPage() {
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Shield className="h-12 w-12 text-primary" />
              <h1 className="text-4xl font-bold">OTCping</h1>
            </div>
            <Badge variant="secondary" className="mb-4 px-4 py-2">
              <Zap className="h-4 w-4 mr-2" />
              Beta Phase Active
            </Badge>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              We're in Beta Phase
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              OTCping is currently in private beta. We're working with a select group of traders 
              to perfect the platform before our public launch.
            </p>
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Beta Info Card */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  What is Beta Phase?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  During our beta phase, we're inviting experienced traders and industry 
                  professionals to test our platform and provide valuable feedback.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Early Access</p>
                      <p className="text-sm text-muted-foreground">
                        Be among the first to experience next-gen OTC trading
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Direct Feedback</p>
                      <p className="text-sm text-muted-foreground">
                        Shape the platform with your input and suggestions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Priority Support</p>
                      <p className="text-sm text-muted-foreground">
                        Get dedicated support and guidance from our team
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Join Beta Card */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Join the Beta
                </CardTitle>
                <CardDescription>
                  Apply for beta access and be part of the future of OTC trading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We're looking for experienced traders, institutions, and crypto 
                  professionals who can provide meaningful feedback and help us 
                  refine the platform.
                </p>
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium mb-1">Ideal candidates:</p>
                    <ul className="text-muted-foreground space-y-1 ml-4">
                      <li>• Active crypto traders</li>
                      <li>• Institutional representatives</li>
                      <li>• DeFi professionals</li>
                      <li>• Market makers</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowApplicationModal(true)}
                  className="w-full"
                  size="lg"
                >
                  Apply for Beta Access
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features Preview */}
          <Card>
            <CardHeader>
              <CardTitle>What You'll Get Access To</CardTitle>
              <CardDescription>
                Preview of the advanced trading features available in beta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Advanced Trading</h3>
                  <p className="text-sm text-muted-foreground">
                    Professional-grade OTC trading tools and order management
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Private Networks</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with verified traders and institutions
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Enhanced Security</h3>
                  <p className="text-sm text-muted-foreground">
                    Bank-grade security with multi-layer verification
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-12 pt-8 border-t border-border">
            <p className="text-muted-foreground">
              Questions about our beta program?{" "}
              <a href="mailto:beta@otcping.com" className="text-primary hover:underline">
                Contact our team
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Beta Application Modal */}
      <BetaApplicationModal 
        open={showApplicationModal}
        onOpenChange={setShowApplicationModal}
      />
    </div>
  );
}