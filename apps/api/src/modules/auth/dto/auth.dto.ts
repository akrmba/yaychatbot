import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "jane@acme.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "hunter2secret" })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: "Jane Doe" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "Acme Corp" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  organizationName!: string;
}

export class LoginDto {
  @ApiProperty({ example: "jane@acme.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "hunter2secret" })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: "Production Key" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
