import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLicenses } from "@/hooks/useLicenses";

interface LicenseBadgesProps {
  licenseIds: string[];
  maxDisplay?: number;
}

export function LicenseBadges({ licenseIds, maxDisplay = 2 }: LicenseBadgesProps) {
  const { licenses } = useLicenses();
  
  if (!licenseIds.length) return null;

  const userLicenses = licenses.filter(license => licenseIds.includes(license.id));
  const displayLicenses = userLicenses.slice(0, maxDisplay);
  const remainingCount = userLicenses.length - maxDisplay;

  return (
    <div className="flex gap-1 flex-wrap">
        {displayLicenses.map((license) => (
          <Tooltip key={license.id}>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                {license.regionCode}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" sideOffset={5} className="z-50">
              <div className="max-w-xs">
                <p className="font-semibold">{license.licenseName}</p>
                <p className="text-xs text-muted-foreground">{license.description}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                +{remainingCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" sideOffset={5} className="z-50">
              <div className="max-w-xs">
                {userLicenses.slice(maxDisplay).map((license) => (
                  <div key={license.id} className="mb-1">
                    <p className="font-semibold">{license.licenseName}</p>
                    <p className="text-xs text-muted-foreground">{license.description}</p>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
  );
}