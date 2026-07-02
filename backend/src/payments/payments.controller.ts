import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        method: string | null;
      };
    };
  };
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAccessGuard)
  @Post('checkout')
  createCheckout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.paymentsService.createCheckout(
      user.sub,
      dto.plan,
      dto.billingCycle,
    );
  }

  @UseGuards(JwtAccessGuard)
  @Get('invoices')
  listMyInvoices(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.listMyInvoices(user.sub);
  }

  // Called by Razorpay's servers, not the frontend — no JWT guard. Body
  // arrives as a raw Buffer (see main.ts) so the signature can be verified
  // against the exact bytes Razorpay signed.
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = (req.body as Buffer)?.toString('utf8') ?? '';
    if (
      !signature ||
      !this.paymentsService.verifyWebhookSignature(rawBody, signature)
    ) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    if (payload.event === 'payment.captured') {
      const {
        order_id: orderId,
        id: paymentId,
        method,
      } = payload.payload.payment.entity;
      await this.paymentsService.handlePaymentCaptured(
        orderId,
        paymentId,
        method,
      );
    } else if (payload.event === 'payment.failed') {
      await this.paymentsService.handlePaymentFailed(
        payload.payload.payment.entity.order_id,
      );
    }
    return { received: true };
  }
}
