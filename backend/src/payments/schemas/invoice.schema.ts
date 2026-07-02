import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice>;

@Schema({ timestamps: { createdAt: false, updatedAt: false } })
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payment', required: true, unique: true })
  paymentId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop({ required: true })
  subtotalPaise: number;

  @Prop({ required: true })
  gstPaise: number;

  @Prop({ required: true })
  totalPaise: number;

  @Prop({ type: Date, default: Date.now })
  issuedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ userId: 1, issuedAt: -1 });
