import React, { type ReactNode } from "react";
import { ProductProvider } from "@/store/AdminContext/ProductContext/ProductsCotnext";
import { AuctionProvider } from "@/store/AdminContext/AuctionContext/AuctionContext";
import { VoucherProvider } from "@/store/AdminContext/VoucherContext/VoucherContext";
import { CategoryProvider } from "@/store/AdminContext/CategoryContext/CategoryContext";
import { AuctionRequestProvider } from "@/store/AdminContext/AuctionRequestContext/AuctionRequestContext";
import { ContactFeedbackProvider } from "@/store/AdminContext/ContactFeedbackContext/ContactFeedbackContext";
import { BidProvider } from "@/store/AdminContext/Bidcontext/Bidcontext";
import { ParticipantProvider } from "@/store/AdminContext/Participantcontext/Participantcontext";
import { LastOfferProvider } from "@/store/AdminContext/LastOfferContext/LastOfferContext";
import { HeroSlideProvider } from "@/store/AdminContext/HeroSlideContext/HeroSlideContext";
import { LeftSectionProvider } from "@/store/AdminContext/LeftSectionContext/LeftSectionContext";
import { RightSectionProvider } from "@/store/AdminContext/RightSectionContext/RightSectionContext";
import { SupplierProvider } from "@/store/AdminContext/SupplierContext/SupplierContext";
import { PurchaseProvider } from "@/store/AdminContext/PurchaseContext/PurchaseContext";
import { TicketProvider } from "@/store/AdminContext/TicketContext/TicketContext";

export default function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <CategoryProvider>
      <ProductProvider>
        <SupplierProvider>
          <AuctionProvider>
            <VoucherProvider>
              <AuctionRequestProvider>
                <ContactFeedbackProvider>
                  <BidProvider>
                    <ParticipantProvider>
                      <LastOfferProvider>
                        <HeroSlideProvider>
                          <LeftSectionProvider>
                            <RightSectionProvider>
                              <PurchaseProvider>
                                <TicketProvider>
                                  {children}
                                </TicketProvider>
                              </PurchaseProvider>
                            </RightSectionProvider>
                          </LeftSectionProvider>
                        </HeroSlideProvider>
                      </LastOfferProvider>
                    </ParticipantProvider>
                  </BidProvider>
                </ContactFeedbackProvider>
              </AuctionRequestProvider>
            </VoucherProvider>
          </AuctionProvider>
        </SupplierProvider>
      </ProductProvider>
    </CategoryProvider>
  );
}
