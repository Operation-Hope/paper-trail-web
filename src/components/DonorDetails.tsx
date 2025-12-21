/**
 * Donor details header component
 * Displays donor information with a close button to return to search
 *
 * @param donor - The donor object containing name, type, employer, and state
 * @param onClose - Callback fired when the back button is clicked to return to search
 */
import { Card, CardContent } from './ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { Separator } from './ui/separator';
import type { Donor } from '../types/api';

interface DonorDetailsProps {
  donor: Donor;
  onClose: () => void;
}

export function DonorDetails({ donor, onClose }: DonorDetailsProps) {
  return (
    <>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={onClose} className="cursor-pointer">
              Donors
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{donor.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="pb-4 text-center">
            <h2 className="text-foreground mb-2 text-3xl font-bold">
              {donor.name}
            </h2>
            <p className="text-muted-foreground text-lg">{donor.donor_type}</p>
            {donor.employer && (
              <p className="mt-1 text-sm text-gray-500">
                Employer: {donor.employer}
              </p>
            )}
            {donor.state && (
              <p className="text-sm text-gray-500">State: {donor.state}</p>
            )}
          </div>
          <Separator />
        </CardContent>
      </Card>
    </>
  );
}
